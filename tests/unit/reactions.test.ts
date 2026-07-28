import { describe, expect, it } from "vitest";
import { Original12Model } from "../../src/simulation/models/original12/model";
import { SequenceRandom } from "../../src/simulation/models/original12/rng";

const initialCalls = Array(8).fill(0.5);
const neutron = (
  x: number,
  y: number,
  fast: boolean,
  dx = 0,
  dy = 0,
) => [{ x, y, dx, dy, fast }];

describe("Materialreaktionen und Emissionen", () => {
  it("prüft Moderatorabsorption unabhängig nach erfolgreicher Moderation", () => {
    const rng = new SequenceRandom([
      ...initialCalls,
      0.5,
      0.5,
      0.049,
      0.002,
      0.5,
    ]);
    const model = new Original12Model(1, rng);
    model.setTestNeutrons(neutron(64, 64, true));
    model.step();
    expect(model.createSnapshot().neutronCount).toBe(0);
    expect(rng.calls).toBe(13);
  });

  it("wendet für langsame Moderatorneutronen nur die Absorptionsprüfung an", () => {
    const rng = new SequenceRandom([...initialCalls, 0.002, 0.5]);
    const model = new Original12Model(1, rng);
    model.setTestNeutrons(neutron(64, 64, false));
    model.step();
    expect(model.createSnapshot().neutronCount).toBe(0);
    expect(rng.calls).toBe(10);
  });

  it("verwendet die frische Spaltgrenze strikt unter 0,02", () => {
    const atBoundary = new Original12Model(
      1,
      new SequenceRandom([...initialCalls, 0.02, 0.5, 0.5]),
    );
    atBoundary.setTestNeutrons(neutron(80, 64, false));
    atBoundary.step();
    expect(atBoundary.createSnapshot().fissionsThisStep).toBe(0);

    const below = new Original12Model(
      1,
      new SequenceRandom([
        ...initialCalls,
        0.019999,
        ...Array(6).fill(0.75),
        0.5,
      ]),
    );
    below.setTestNeutrons(neutron(80, 64, false));
    below.step();
    expect(below.createSnapshot().fissionsThisStep).toBe(1);
  });

  it("hat bei Abbrand 10 keine Spaltung und Absorption 0,005", () => {
    const model = new Original12Model(
      1,
      new SequenceRandom([...initialCalls, 0, 0.004999, 0.5]),
    );
    model.setTestBurnout(80, 64, 10);
    model.setTestNeutrons(neutron(80, 64, false));
    model.step();
    const snapshot = model.createSnapshot();
    expect(snapshot.fissionsThisStep).toBe(0);
    expect(snapshot.neutronCount).toBe(0);
    expect(snapshot.burnout[64 * 525 + 80]).toBe(10);
  });

  it("absorbiert langsame Neutronen im Absorber ohne Zufall", () => {
    const rng = new SequenceRandom([...initialCalls, 0.5]);
    const model = new Original12Model(1, rng);
    model.setTestNeutrons(neutron(70, 64, false));
    model.step();
    expect(model.createSnapshot().neutronCount).toBe(0);
    expect(rng.calls).toBe(9);
  });

  it("verwendet für schnelle Absorberneutronen strikt die Grenze 0,2", () => {
    const run = (absorptionValue: number) => {
      const model = new Original12Model(
        1,
        new SequenceRandom([
          ...initialCalls,
          0.5,
          0.5,
          absorptionValue,
          0.5,
        ]),
      );
      model.setTestNeutrons(neutron(70, 64, true));
      model.step();
      return model.createSnapshot().neutronCount;
    };
    expect(run(0.199999)).toBe(0);
    expect(run(0.2)).toBe(1);
  });

  it("lässt Leerraum und Quellenmaterial reaktionslos", () => {
    const emptyRng = new SequenceRandom([...initialCalls, 0.5]);
    const empty = new Original12Model(1, emptyRng);
    empty.setTestNeutrons(neutron(10, 10, false));
    empty.step();
    expect(empty.createSnapshot().neutronCount).toBe(1);
    expect(emptyRng.calls).toBe(9);

    const sourceRng = new SequenceRandom([...initialCalls, 0.9, 0.5]);
    const source = new Original12Model(1, sourceRng);
    source.applyCommand({ type: "set-source", enabled: true });
    source.setTestNeutrons(neutron(263, 441, false));
    source.step();
    expect(source.createSnapshot().neutronCount).toBe(1);
  });

  it("streut schnelle Neutronen mit nicht normierten Komponenten in [-2, 2)", () => {
    const model = new Original12Model(
      1,
      new SequenceRandom([...initialCalls, 0, 0.999999, 0.5, 0.5, 0.5]),
    );
    model.setTestNeutrons(neutron(64, 64, true));
    model.step();
    const snapshot = model.createSnapshot();
    expect(snapshot.neutronX[0]).toBe(62);
    expect(snapshot.neutronY[0]).toBeCloseTo(66, 4);
    expect(Math.hypot(-2, 1.999996)).not.toBeCloseTo(5);
  });

  it("prüft Quelle vor unabhängiger Hintergrundstrahlung", () => {
    const rng = new SequenceRandom([
      ...initialCalls,
      0.49,
      0.75,
      0.75,
      0.5,
    ]);
    const model = new Original12Model(1, rng);
    model.setTestNeutrons([]);
    model.applyCommand({ type: "set-source", enabled: true });
    model.step();
    const snapshot = model.createSnapshot();
    expect(snapshot.neutronCount).toBe(1);
    expect(snapshot.neutronX[0]).toBe(263);
    expect(snapshot.neutronY[0]).toBe(441);
    expect(rng.calls).toBe(12);
  });

  it("überspringt bei ausgeschalteter Quelle nur deren Erfolgstest", () => {
    const rng = new SequenceRandom([...initialCalls, 0.5]);
    const model = new Original12Model(1, rng);
    model.setTestNeutrons([]);
    model.step();
    expect(model.createSnapshot().neutronCount).toBe(0);
    expect(rng.calls).toBe(9);
  });

  it("würfelt bei erfolgreicher Hintergrundemission Position und Richtung", () => {
    const rng = new SequenceRandom([
      ...initialCalls,
      0.009,
      0.25,
      0.75,
      0.75,
      0.75,
    ]);
    const model = new Original12Model(1, rng);
    model.setTestNeutrons([]);
    model.step();
    const snapshot = model.createSnapshot();
    expect(snapshot.neutronCount).toBe(1);
    expect(snapshot.neutronX[0]).toBe(131);
    expect(snapshot.neutronY[0]).toBe(393);
    expect(rng.calls).toBe(13);
  });
});
