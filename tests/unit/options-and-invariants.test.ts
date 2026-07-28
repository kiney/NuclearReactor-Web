import { describe, expect, it } from "vitest";
import {
  CORE_MAX,
  CORE_MIN,
  GRID_SIZE,
  MATERIAL,
  MAX_NEUTRONS,
} from "../../src/simulation/models/original12/constants";
import { Original12Model } from "../../src/simulation/models/original12/model";
import { DelphiLcg, SequenceRandom } from "../../src/simulation/models/original12/rng";

describe("Optionen und Invarianten", () => {
  it("entfernt Moderator und Reflektor irreversibel bis Reset", () => {
    const model = new Original12Model(1);
    model.applyCommand({ type: "set-reflector", enabled: true });
    model.applyCommand({ type: "set-source", enabled: true });
    model.applyCommand({ type: "drain-moderator" });
    const drained = model.createSnapshot();
    expect(drained.reflectorEnabled).toBe(false);
    expect(drained.moderatorDrained).toBe(true);
    expect(drained.material).not.toContain(MATERIAL.MODERATOR);
    expect(
      drained.material.filter((value) => value === MATERIAL.SOURCE),
    ).toHaveLength(64);
    expect(model.applyCommand({ type: "drain-moderator" })).toEqual({
      accepted: false,
      reason: "moderator-already-drained",
    });

    model.reset(1);
    const reset = model.createSnapshot();
    expect(reset.moderatorDrained).toBe(false);
    expect(reset.material).toContain(MATERIAL.MODERATOR);
  });

  it("kann nach Moderatorablass erneut nur den Außenrand moderieren", () => {
    const model = new Original12Model(1);
    model.applyCommand({ type: "drain-moderator" });
    model.applyCommand({ type: "set-reflector", enabled: true });
    const material = model.createSnapshot().material;
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const outside =
          x < CORE_MIN || x > CORE_MAX || y < CORE_MIN || y > CORE_MAX;
        if (material[y * GRID_SIZE + x] === MATERIAL.MODERATOR) {
          expect(outside).toBe(true);
        }
      }
    }
  });

  it("Histogrammreset verbraucht kein RNG und ändert keinen Fachzustand", () => {
    const model = new Original12Model(42);
    for (let index = 0; index < 12; index += 1) model.step();
    const before = model.createSnapshot();
    model.applyCommand({ type: "reset-histograms" });
    const after = model.createSnapshot();
    expect(after.rngState).toBe(before.rngState);
    expect(after.step).toBe(before.step);
    expect(after.power).toBe(before.power);
    expect(after.neutronX).toEqual(before.neutronX);
    expect(after.neutronY).toEqual(before.neutronY);
    expect(after.material).toEqual(before.material);
    expect(after.horizontalHistogram.progress).toBe(0);
  });

  it("zählt Histogramme im Modell vor der Bewegung", () => {
    const model = new Original12Model(1, new SequenceRandom([]));
    model.setTestNeutrons([
      { x: 212, y: 250, dx: 2, dy: 0, fast: false },
    ]);
    for (let index = 0; index < 100; index += 1) model.step();
    const current = model.createSnapshot().horizontalHistogram.current;
    expect(current?.slow[212]).toBeGreaterThan(0);
  });

  it("deaktiviert Neutronen an der exklusiven Bewegungsgrenze 524", () => {
    const outside = new Original12Model(1, new SequenceRandom([]));
    outside.setTestNeutrons([
      { x: 523, y: 10, dx: 1, dy: 0, fast: false },
    ]);
    outside.step();
    expect(outside.createSnapshot().neutronCount).toBe(0);

    const inside = new Original12Model(1, new SequenceRandom([]));
    inside.setTestNeutrons([
      { x: 523, y: 10, dx: 0.5, dy: 0, fast: false },
    ]);
    inside.step();
    expect(inside.createSnapshot().neutronCount).toBe(1);
    expect(inside.createSnapshot().neutronX[0]).toBe(523.5);
  });

  it("legt bei fast vollem Pool nur einzeln verfügbare Spaltkinder an", () => {
    const model = new Original12Model(
      1,
      new SequenceRandom([...Array(8).fill(0.5), 0, 0.75, 0.75, 0.5]),
    );
    model.fillTestNeutrons(MAX_NEUTRONS - 2, {
      x: 10,
      y: 10,
      dx: 0,
      dy: 0,
      fast: false,
    });
    model.appendTestNeutron({
      x: 80,
      y: 64,
      dx: 0,
      dy: 0,
      fast: false,
    });
    model.step();
    const snapshot = model.createSnapshot();
    expect(snapshot.fissionsThisStep).toBe(1);
    expect(snapshot.neutronCount).toBe(MAX_NEUTRONS - 1);
    expect(snapshot.saturatedEmissions).toBe(2);
  });

  it("hält Invarianten nach einer langen Befehls- und Schrittfolge", () => {
    const commandRng = new DelphiLcg(0xc0ffee);
    const model = new Original12Model(0x12345678);
    const commands = [
      () => model.applyCommand({ type: "withdraw-safety-rods" }),
      () => model.applyCommand({ type: "move-control-rods", direction: "out" }),
      () => model.applyCommand({ type: "move-control-rods", direction: "in" }),
      () => model.applyCommand({ type: "change-range", direction: "higher" }),
      () => model.applyCommand({ type: "change-range", direction: "lower" }),
      () =>
        model.applyCommand({
          type: "set-source",
          enabled: commandRng.next() < 0.5,
        }),
      () =>
        model.applyCommand({
          type: "set-reflector",
          enabled: commandRng.next() < 0.5,
        }),
      () =>
        model.applyCommand({
          type: "set-burnout",
          enabled: commandRng.next() < 0.5,
        }),
      () => model.applyCommand({ type: "scram" }),
    ];
    for (let index = 0; index < 500; index += 1) {
      commands[Math.floor(commandRng.next() * commands.length)]();
      model.step();
      const snapshot = model.createSnapshot();
      expect(snapshot.neutronCount).toBeGreaterThanOrEqual(0);
      expect(snapshot.neutronCount).toBeLessThanOrEqual(MAX_NEUTRONS);
      expect(snapshot.controlRodEnd).toBeGreaterThanOrEqual(64);
      expect(snapshot.controlRodEnd).toBeLessThanOrEqual(461);
      expect(snapshot.detectorRangeIndex).toBeGreaterThanOrEqual(2);
      expect(snapshot.detectorRangeIndex).toBeLessThanOrEqual(5);
      expect(snapshot.horizontalHistogram.progress).toBeGreaterThanOrEqual(0);
      expect(snapshot.horizontalHistogram.progress).toBeLessThan(100);
      expect(
        snapshot.neutronX.every((position) => position >= 0 && position < 524),
      ).toBe(true);
      expect(
        snapshot.neutronY.every((position) => position >= 0 && position < 524),
      ).toBe(true);
      expect(snapshot.burnout.every((value) => value <= 10)).toBe(true);
      expect(snapshot.material.every((value) => value >= 0 && value <= 5)).toBe(
        true,
      );
      if (snapshot.protectionState === "tripped") {
        expect(snapshot.controlRodEnd).toBe(461);
      }
    }
  });

  it("liefert für gleiche Seeds und Befehle bitgleiche Zustände", () => {
    const first = new Original12Model(0xabcdef01);
    const second = new Original12Model(0xabcdef01);
    for (let index = 0; index < 200; index += 1) {
      if (index === 3) {
        first.applyCommand({ type: "withdraw-safety-rods" });
        second.applyCommand({ type: "withdraw-safety-rods" });
      }
      if (index % 17 === 0) {
        first.applyCommand({ type: "move-control-rods", direction: "out" });
        second.applyCommand({ type: "move-control-rods", direction: "out" });
      }
      if (index === 40) {
        first.applyCommand({ type: "set-source", enabled: true });
        second.applyCommand({ type: "set-source", enabled: true });
      }
      first.step();
      second.step();
    }
    const a = first.createSnapshot();
    const b = second.createSnapshot();
    expect(b.rngState).toBe(a.rngState);
    expect(b.neutronX).toEqual(a.neutronX);
    expect(b.neutronY).toEqual(a.neutronY);
    expect(b.neutronFast).toEqual(a.neutronFast);
    expect(b.material).toEqual(a.material);
    expect(b.burnout).toEqual(a.burnout);
    expect(b.power).toBe(a.power);
    expect(b.fissionsTotal).toBe(a.fissionsTotal);
  });
});
