import { describe, expect, it } from "vitest";
import { Original12Model } from "../../src/simulation/models/original12/model";
import { SequenceRandom } from "../../src/simulation/models/original12/rng";

const stationary = (count: number, fast = true, x = 10, y = 10) =>
  Array.from({ length: count }, () => ({ x, y, dx: 0, dy: 0, fast }));

const quietModel = () => new Original12Model(1, new SequenceRandom([]));

describe("Instrumente und Schutzkreis", () => {
  it("klemmt und schneidet den Detektorwert ab", () => {
    const model = quietModel();
    model.setTestNeutrons(stationary(999));
    model.step();
    expect(model.createSnapshot().detectorPercent).toBe(100);

    model.applyCommand({ type: "change-range", direction: "higher" });
    model.setTestNeutrons(stationary(29));
    model.step();
    expect(model.createSnapshot().detectorPercent).toBe(2);
  });

  it("löst bei exakt 3 Prozent nicht, darunter aber aus", () => {
    const boundary = quietModel();
    boundary.setTestNeutrons(stationary(30));
    boundary.applyCommand({ type: "withdraw-safety-rods" });
    boundary.applyCommand({ type: "change-range", direction: "higher" });
    boundary.step();
    expect(boundary.createSnapshot().detectorPercent).toBe(3);
    expect(boundary.createSnapshot().protectionState).toBe("armed");

    const below = quietModel();
    below.setTestNeutrons(stationary(29));
    below.applyCommand({ type: "withdraw-safety-rods" });
    below.applyCommand({ type: "change-range", direction: "higher" });
    below.step();
    expect(below.createSnapshot().lastScram?.reason).toBe(
      "detector-low-range",
    );
  });

  it("deaktiviert Unterbereichs-SCRAM bei Maximum 100", () => {
    const model = quietModel();
    model.setTestNeutrons([]);
    model.applyCommand({ type: "withdraw-safety-rods" });
    model.step();
    expect(model.createSnapshot().protectionState).toBe("armed");
  });

  it("berechnet Leistung exakt aus altem Wert und Aktivität", () => {
    const model = quietModel();
    model.setTestPower(10);
    model.setTestNeutrons(stationary(1, false, 80, 64));
    model.step();
    expect(model.createSnapshot().power).toBe(9.01);
  });

  it("löst Leistung strikt oberhalb 120 aus", () => {
    const boundary = quietModel();
    boundary.setTestNeutrons(stationary(1_200, false, 80, 64));
    boundary.setTestPower(120);
    boundary.applyCommand({ type: "withdraw-safety-rods" });
    boundary.applyCommand({ type: "change-range", direction: "higher" });
    boundary.applyCommand({ type: "change-range", direction: "higher" });
    boundary.step();
    expect(boundary.createSnapshot().power).toBe(120);
    expect(boundary.createSnapshot().protectionState).toBe("armed");

    const above = quietModel();
    above.setTestNeutrons(stationary(1_200, false, 80, 64));
    above.setTestPower(120.001);
    above.applyCommand({ type: "withdraw-safety-rods" });
    above.applyCommand({ type: "change-range", direction: "higher" });
    above.applyCommand({ type: "change-range", direction: "higher" });
    above.step();
    expect(above.createSnapshot().lastScram?.reason).toBe("power-high");
  });

  it("prüft automatische Grenzen nur im Zustand armed", () => {
    const model = quietModel();
    model.setTestNeutrons(stationary(100));
    model.setTestPower(1_000);
    model.step();
    expect(model.createSnapshot().protectionState).toBe("inserted");
    expect(model.createSnapshot().lastScram).toBeNull();
  });

  it("überschreibt die erste Ursache eines Schritts nicht", () => {
    const model = quietModel();
    model.setTestNeutrons(stationary(91));
    model.setTestPower(1_000);
    model.applyCommand({ type: "withdraw-safety-rods" });
    model.step();
    expect(model.createSnapshot().lastScram?.reason).toBe("detector-high");
  });

  it("quittiert die rote Auslösung beim erneuten Scharfschalten", () => {
    const model = quietModel();
    model.applyCommand({ type: "scram" });
    expect(model.createSnapshot().protectionState).toBe("tripped");
    model.applyCommand({ type: "withdraw-safety-rods" });
    const snapshot = model.createSnapshot();
    expect(snapshot.protectionState).toBe("armed");
    expect(snapshot.lastScram?.reason).toBe("manual");
  });
});
