import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORIGINAL12_CONFIG,
  MATERIAL,
} from "../../src/simulation/models/original12/constants";
import {
  isPriorityOriginal12Command,
  Original12Model,
} from "../../src/simulation/models/original12/model";
import { SequenceRandom } from "../../src/simulation/models/original12/rng";

const stationary = (count: number, fast = true, x = 10, y = 10) =>
  Array.from({ length: count }, () => ({ x, y, dx: 0, dy: 0, fast }));

describe("Original12Model", () => {
  it("initialisiert und validiert die versionierte Modellkonfiguration", () => {
    const model = new Original12Model(99);
    model.initialize(DEFAULT_ORIGINAL12_CONFIG, 1);
    const snapshot = model.createSnapshot();
    expect(snapshot.seed).toBe(1);
    expect(snapshot.configuration).toEqual(DEFAULT_ORIGINAL12_CONFIG);
    expect(() =>
      model.initialize(
        { profile: "invalid" } as unknown as typeof DEFAULT_ORIGINAL12_CONFIG,
        1,
      ),
    ).toThrow("invalid-original-1.2-configuration");
  });

  it("weist nicht endliche Zahlenzustände im Testbuild zurück", () => {
    const model = new Original12Model(1);
    model.setTestPower(Number.NaN);
    expect(() => model.step()).toThrow("non-finite-model-state");
  });

  it("deklariert ausschließlich SCRAM als priorisierten Fachbefehl", () => {
    expect(isPriorityOriginal12Command({ type: "scram" })).toBe(true);
    expect(
      isPriorityOriginal12Command({ type: "set-source", enabled: true }),
    ).toBe(false);
  });

  it("initialisiert den bestätigten fachlichen Zustand", () => {
    const snapshot = new Original12Model(1).createSnapshot();
    expect(snapshot.step).toBe(0);
    expect(snapshot.neutronCount).toBe(2);
    expect(snapshot.fastNeutronCount).toBe(2);
    expect(snapshot.controlRodEnd).toBe(461);
    expect(snapshot.controlRodPercent).toBe(0);
    expect(snapshot.protectionState).toBe("inserted");
    expect(snapshot.detectorMaximum).toBe(100);
    expect(snapshot.power).toBe(0);
  });

  it("erstellt Telemetrie ohne Kopie der unveränderten Rasterebenen", () => {
    const model = new Original12Model(1);
    expect(model.createSnapshot("full").material).toHaveLength(525 * 525);
    expect(model.createSnapshot("telemetry").material).toHaveLength(0);
    expect(model.createSnapshot("telemetry").burnout).toHaveLength(0);
  });

  it("fährt Steuerstäbe in diskreten Schritten bis zu beiden Anschlägen", () => {
    const model = new Original12Model(1);
    expect(model.applyCommand({ type: "withdraw-safety-rods" }).accepted).toBe(
      true,
    );
    const ends = [461];
    while (
      model.applyCommand({
        type: "move-control-rods",
        direction: "out",
      }).accepted
    ) {
      ends.push(model.createSnapshot().controlRodEnd);
    }
    expect(ends.at(-2)).toBe(66);
    expect(ends.at(-1)).toBe(64);
    expect(model.createSnapshot().controlRodPercent).toBe(100);
    expect(
      model.applyCommand({ type: "move-control-rods", direction: "out" }),
    ).toEqual({ accepted: false, reason: "control-rod-end-stop" });
  });

  it("verriegelt Ausfahren, erlaubt Einfahren und SCRAM immer", () => {
    const model = new Original12Model(1);
    expect(
      model.applyCommand({ type: "move-control-rods", direction: "out" }),
    ).toEqual({ accepted: false, reason: "safety-circuit-not-armed" });
    expect(
      model.applyCommand({ type: "move-control-rods", direction: "in" }),
    ).toEqual({ accepted: false, reason: "control-rod-end-stop" });
    model.applyCommand({ type: "scram" });
    expect(model.createSnapshot().protectionState).toBe("tripped");
    expect(model.createSnapshot().lastScram?.reason).toBe("manual");
  });

  it("verriegelt Sicherheitsstäbe außerhalb des Messbereichs 100", () => {
    const model = new Original12Model(1);
    model.applyCommand({ type: "change-range", direction: "higher" });
    expect(model.createSnapshot().detectorMaximum).toBe(1_000);
    expect(model.applyCommand({ type: "withdraw-safety-rods" })).toEqual({
      accepted: false,
      reason: "detector-range-must-be-100",
    });
  });

  it("löst Detektor hoch strikt oberhalb 90 Prozent aus", () => {
    const atBoundary = new Original12Model(1, new SequenceRandom([]));
    atBoundary.setTestNeutrons(stationary(90));
    atBoundary.applyCommand({ type: "withdraw-safety-rods" });
    atBoundary.step();
    expect(atBoundary.createSnapshot().protectionState).toBe("armed");

    const above = new Original12Model(1, new SequenceRandom([]));
    above.setTestNeutrons(stationary(91));
    above.applyCommand({ type: "withdraw-safety-rods" });
    above.step();
    expect(above.createSnapshot().lastScram?.reason).toBe("detector-high");
  });

  it("löst Unterbereich nur im höheren Bereich strikt unter 3 Prozent aus", () => {
    const model = new Original12Model(1, new SequenceRandom([]));
    model.setTestNeutrons(stationary(20));
    model.applyCommand({ type: "withdraw-safety-rods" });
    model.applyCommand({ type: "change-range", direction: "higher" });
    model.step();
    expect(model.createSnapshot().detectorPercent).toBe(2);
    expect(model.createSnapshot().lastScram?.reason).toBe(
      "detector-low-range",
    );
  });

  it("erhält bei exakt 80 Prozent den vorherigen Warnzustand", () => {
    const model = new Original12Model(1, new SequenceRandom([]));
    model.setTestNeutrons(stationary(81));
    model.step();
    expect(model.createSnapshot().detectorWarning).toBe(true);
    model.setTestNeutrons(stationary(80));
    model.step();
    expect(model.createSnapshot().detectorWarning).toBe(true);
    model.setTestNeutrons(stationary(79));
    model.step();
    expect(model.createSnapshot().detectorWarning).toBe(false);
  });

  it("moderiert vor der unabhängigen Absorptionsprüfung", () => {
    const values = [
      ...Array(8).fill(0.5),
      0.5,
      0.5,
      0.04,
      0.5,
      0.5,
    ];
    const rng = new SequenceRandom(values);
    const model = new Original12Model(1, rng);
    model.setTestNeutrons(stationary(1, true, 64, 64));
    model.step();
    const snapshot = model.createSnapshot();
    expect(snapshot.neutronCount).toBe(1);
    expect(snapshot.slowNeutronCount).toBe(1);
    expect(rng.calls).toBe(13);
  });

  it("erzeugt bei Spaltung drei schnelle Kinder erst für Folgeschritte", () => {
    const values = [...Array(8).fill(0.5), 0, ...Array(6).fill(0.75), 0.5];
    const model = new Original12Model(1, new SequenceRandom(values));
    model.setTestNeutrons(stationary(1, false, 80, 64));
    model.step();
    const snapshot = model.createSnapshot();
    expect(snapshot.fissionsThisStep).toBe(1);
    expect(snapshot.fissionsTotal).toBe(1);
    expect(snapshot.neutronCount).toBe(3);
    expect(snapshot.fastNeutronCount).toBe(3);
  });

  it("lässt Abbrand nur aktiviert steigen und erhält ihn beim Ausschalten", () => {
    const run = (enabled: boolean) => {
      const values = [...Array(8).fill(0.5), 0, ...Array(6).fill(0.75), 0.5];
      const model = new Original12Model(1, new SequenceRandom(values));
      model.applyCommand({ type: "set-burnout", enabled });
      model.setTestNeutrons(stationary(1, false, 80, 64));
      model.step();
      return model.createSnapshot().burnout[64 * 525 + 80];
    };
    expect(run(false)).toBe(0);
    expect(run(true)).toBe(1);
  });

  it("stellt Reset mit demselben Seed bitgleich wieder her", () => {
    const model = new Original12Model(0x12345678);
    for (let index = 0; index < 10; index += 1) model.step();
    const first = model.createSnapshot();
    model.reset(0x12345678);
    for (let index = 0; index < 10; index += 1) model.step();
    const second = model.createSnapshot();
    expect(second.rngState).toBe(first.rngState);
    expect(second.neutronX).toEqual(first.neutronX);
    expect(second.neutronY).toEqual(first.neutronY);
    expect(second.neutronFast).toEqual(first.neutronFast);
    expect(second.material).toEqual(first.material);
  });

  it("Quelle bleibt beim Geometrieumbau 8 × 8", () => {
    const model = new Original12Model(1);
    model.applyCommand({ type: "set-source", enabled: true });
    model.applyCommand({ type: "withdraw-safety-rods" });
    model.applyCommand({ type: "move-control-rods", direction: "out" });
    const sourceCells = model
      .createSnapshot()
      .material.reduce(
        (sum, value) => sum + Number(value === MATERIAL.SOURCE),
        0,
      );
    expect(sourceCells).toBe(64);
  });
});
