import { describe, expect, it } from "vitest";
import {
  createOriginalPointLayer,
  createOriginalRasterLayer,
} from "../../src/components/original12/OriginalReactorCanvas";
import { createRgbaRaster } from "../../src/rendering/raster";
import { Original12Model } from "../../src/simulation/models/original12/model";

function pixel(rgba: Uint8ClampedArray, x: number, y: number): number[] {
  const offset = (y * 525 + x) * 4;
  return Array.from(rgba.slice(offset, offset + 4));
}

describe("Originaldarstellung", () => {
  it("ordnet logische Materialpixel unabhängig von Canvas-Antialiasing zu", () => {
    const snapshot = new Original12Model(1).createSnapshot();
    const rgba = createRgbaRaster(createOriginalRasterLayer(snapshot));
    expect(pixel(rgba, 10, 10)).toEqual([248, 250, 252, 255]);
    expect(pixel(rgba, 64, 64)).toEqual([242, 201, 76, 255]);
    expect(pixel(rgba, 70, 64)).toEqual([40, 100, 199, 255]);
    expect(pixel(rgba, 80, 64)).toEqual([46, 173, 98, 255]);
  });

  it("interpoliert sichtbaren Abbrand in zehn diskreten Stufen", () => {
    const model = new Original12Model(1);
    model.setTestBurnout(80, 64, 10);
    model.applyCommand({ type: "set-burnout", enabled: true });
    const rgba = createRgbaRaster(
      createOriginalRasterLayer(model.createSnapshot()),
    );
    expect(pixel(rgba, 80, 64)).toEqual([11, 85, 47, 255]);
  });

  it("dünnt nur die Punktdarstellung unter extremer Last deterministisch aus", () => {
    const model = new Original12Model(1);
    model.fillTestNeutrons(100_000);
    const snapshot = model.createSnapshot();
    const layer = createOriginalPointLayer(snapshot);
    const visible = layer.categories.reduce(
      (sum, category) => sum + category.x.length,
      0,
    );
    expect(snapshot.neutronCount).toBe(100_000);
    expect(visible).toBe(2_000);
  });
});
