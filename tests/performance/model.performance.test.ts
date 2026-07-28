import { describe, expect, it } from "vitest";
import { MAX_NEUTRONS } from "../../src/simulation/models/original12/constants";
import { Original12Model } from "../../src/simulation/models/original12/model";
import { NeutronPool } from "../../src/simulation/models/original12/neutronPool";
import { SequenceRandom } from "../../src/simulation/models/original12/rng";
import { createRgbaRaster } from "../../src/rendering/raster";
import { createOriginalPointLayer } from "../../src/components/original12/OriginalReactorCanvas";
import { createPointRgba } from "../../src/rendering/raster";
import { HistogramCollector } from "../../src/simulation/models/original12/histograms";

describe("grobe Performance-Regressionen", () => {
  it.each([1_000, 10_000])(
    "verarbeitet %i wechselwirkende Neutronen reproduzierbar",
    (count) => {
      const model = new Original12Model(1, new SequenceRandom([]));
      model.fillTestNeutrons(count, {
        x: 64,
        y: 64,
        dx: 0,
        dy: 0,
        fast: true,
      });
      const started = performance.now();
      model.step();
      const elapsed = performance.now() - started;
      expect(model.createSnapshot("telemetry").neutronCount).toBe(count);
      expect(elapsed).toBeLessThan(5_000);
    },
  );

  it("verarbeitet und komprimiert 100.000 Neutronen ohne Speicherwachstum", () => {
    const model = new Original12Model(1, new SequenceRandom([]));
    model.fillTestNeutrons(MAX_NEUTRONS, {
      x: 10,
      y: 10,
      dx: 600,
      dy: 0,
      fast: false,
    });
    const started = performance.now();
    model.step();
    const elapsed = performance.now() - started;
    expect(model.createSnapshot("telemetry").neutronCount).toBe(0);
    expect(elapsed).toBeLessThan(5_000);
  });

  it("behält 100.000 aktive Neutronen innerhalb einer groben Schrittgrenze", () => {
    const model = new Original12Model(1, new SequenceRandom([]));
    model.fillTestNeutrons(MAX_NEUTRONS);
    const started = performance.now();
    model.step();
    const elapsed = performance.now() - started;
    expect(model.createSnapshot("telemetry").neutronCount).toBe(MAX_NEUTRONS);
    expect(elapsed).toBeLessThan(5_000);
  });

  it("erstellt Telemetrie ohne erneute 525²-Rasterkopie", () => {
    const model = new Original12Model(1);
    const telemetry = model.createSnapshot("telemetry");
    expect(telemetry.material.byteLength).toBe(0);
    expect(telemetry.burnout.byteLength).toBe(0);
    expect(model.createSnapshot("full").material.byteLength).toBe(525 * 525);
  });

  it("erzeugt und transferiert einen vollständigen 100.000er Snapshot begrenzt", () => {
    const model = new Original12Model(1);
    model.fillTestNeutrons(MAX_NEUTRONS);
    const started = performance.now();
    const snapshot = model.createSnapshot("full");
    const elapsed = performance.now() - started;
    const buffers = [
      snapshot.material.buffer,
      snapshot.burnout.buffer,
      snapshot.neutronX.buffer,
      snapshot.neutronY.buffer,
      snapshot.neutronFast.buffer,
    ];
    const transferred = structuredClone(snapshot, { transfer: buffers });
    const bytes =
      transferred.material.byteLength +
      transferred.burnout.byteLength +
      transferred.neutronX.byteLength +
      transferred.neutronY.byteLength +
      transferred.neutronFast.byteLength;
    expect(bytes).toBeLessThan(2_000_000);
    expect(transferred.neutronCount).toBe(MAX_NEUTRONS);
    expect(snapshot.neutronX.byteLength).toBe(0);
    expect(model.createSnapshot("telemetry").neutronCount).toBe(MAX_NEUTRONS);
    expect(elapsed).toBeLessThan(5_000);
  });

  it.each([0, 0.5, 0.9])(
    "komprimiert einen Pool mit %i Anteil inaktiver Einträge in-place",
    (inactiveRatio) => {
      const pool = new NeutronPool();
      const count = 10_000;
      for (let index = 0; index < count; index += 1) {
        pool.add(index, index, 0, 0, true);
        if (index < count * inactiveRatio) pool.active[index] = 0;
      }
      pool.compact();
      expect(pool.count).toBe(count - Math.floor(count * inactiveRatio));
    },
  );

  it("baut ein vollständiges variables Materialbild ohne Zusatzbibliothek", () => {
    const cells = new Uint8Array(525 * 525);
    cells.fill(77);
    const rgba = createRgbaRaster({
      width: 525,
      height: 525,
      cells,
      revision: 1,
      styles: [{ id: 77, color: [12, 34, 56] }],
    });
    expect(rgba.byteLength).toBe(525 * 525 * 4);
    expect(Array.from(rgba.slice(-4))).toEqual([12, 34, 56, 255]);
  });

  it("rastert die gedrosselte Punktdarstellung bei fester Canvas-Größe", () => {
    const model = new Original12Model(1);
    model.fillTestNeutrons(MAX_NEUTRONS);
    const layer = createOriginalPointLayer(model.createSnapshot());
    const started = performance.now();
    const rgba = createPointRgba(layer);
    const elapsed = performance.now() - started;
    expect(rgba.byteLength).toBe(525 * 525 * 4);
    expect(elapsed).toBeLessThan(5_000);
  });

  it("sammelt Histogramme dauerhaft mit beschränkten Fenstern", () => {
    const collector = new HistogramCollector();
    for (let step = 0; step < 10_000; step += 1) {
      collector.countNeutron(250, 250, step % 2 === 0);
      collector.finishStep();
    }
    const snapshots = collector.snapshots();
    expect(collector.revision).toBe(100);
    expect(snapshots.horizontal.current).not.toBeNull();
    expect(snapshots.horizontal.previous).not.toBeNull();
    expect(snapshots.horizontal.current?.fast).toHaveLength(525);
  });
});
