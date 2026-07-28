import { describe, expect, it } from "vitest";
import { HistogramCollector } from "../../src/simulation/models/original12/histograms";

describe("Dichtehistogramme", () => {
  it("verwendet die inklusiven Bandgrenzen", () => {
    const histograms = new HistogramCollector();
    histograms.countNeutron(10, 212.999, true);
    histograms.countNeutron(11, 213, true);
    histograms.countNeutron(12, 311, false);
    histograms.countNeutron(13, 311.001, false);
    for (let step = 0; step < 100; step += 1) histograms.finishStep();
    const current = histograms.snapshots().horizontal.current;
    expect(current?.fast[11]).toBe(1);
    expect(current?.slow[12]).toBe(1);
    expect(current?.fast[10]).toBe(0);
    expect(current?.slow[13]).toBe(0);
  });

  it("schließt exakt nach 100 Schritten ab und rotiert zwei Fenster", () => {
    const histograms = new HistogramCollector();
    for (let step = 0; step < 99; step += 1) histograms.finishStep();
    expect(histograms.snapshots().horizontal.current).toBeNull();
    expect(histograms.progress).toBe(99);
    histograms.countNeutron(20, 250, true);
    histograms.finishStep();
    expect(histograms.progress).toBe(0);
    expect(histograms.snapshots().horizontal.current?.fast[20]).toBe(1);
    for (let step = 0; step < 100; step += 1) histograms.finishStep();
    expect(histograms.snapshots().horizontal.previous?.fast[20]).toBe(1);
  });

  it("normalisiert schnelle und langsame Kurve mit demselben Maximum", () => {
    const histograms = new HistogramCollector();
    histograms.countNeutron(20, 250, true);
    histograms.countNeutron(20, 250, true);
    histograms.countNeutron(21, 250, false);
    for (let step = 0; step < 100; step += 1) histograms.finishStep();
    const current = histograms.snapshots().horizontal.current;
    expect(current?.maximum).toBe(2);
    expect(current?.fast[20]).toBe(1);
    expect(current?.slow[21]).toBe(0.5);
  });
});
