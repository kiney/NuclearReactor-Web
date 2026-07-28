import { describe, expect, it } from "vitest";
import type {
  PointLayer,
  RasterLayer,
} from "../../src/simulation/contract/renderData";
import { createPointRgba, createRgbaRaster } from "../../src/rendering/raster";

describe("gemeinsamer Rendervertrag", () => {
  it("rendert ein abweichendes 3 × 2-Modell ohne Originalcodes", () => {
    const layer: RasterLayer = {
      width: 3,
      height: 2,
      revision: 1,
      cells: new Uint8Array([42, 7, 42, 7, 7, 42]),
      styles: [
        { id: 42, color: [1, 2, 3] },
        { id: 7, color: [250, 240, 230, 128] },
      ],
    };
    const result = createRgbaRaster(layer);
    expect(result).toHaveLength(24);
    expect(Array.from(result.slice(0, 8))).toEqual([
      1, 2, 3, 255, 250, 240, 230, 128,
    ]);
  });

  it("weist inkonsistente variable Rastergrößen zurück", () => {
    expect(() =>
      createRgbaRaster({
        width: 4,
        height: 4,
        revision: 1,
        cells: new Uint8Array(3),
        styles: [],
      }),
    ).toThrow("raster-size-mismatch");
  });

  it("rendert fremde Punktkategorien und variable Koordinaten ohne Originalcodes", () => {
    const layer: PointLayer = {
      width: 3,
      height: 2,
      revision: 1,
      categories: [
        {
          id: "ion",
          color: "#010203",
          x: new Float32Array([0.9, 2.1]),
          y: new Float32Array([0.1, 1.9]),
        },
        {
          id: "photon",
          color: "#faf0e680",
          x: new Float32Array([1]),
          y: new Float32Array([0]),
        },
      ],
    };
    const result = createPointRgba(layer);
    expect(Array.from(result.slice(0, 12))).toEqual([
      1, 2, 3, 255, 250, 240, 230, 128, 0, 0, 0, 0,
    ]);
    expect(Array.from(result.slice(-4))).toEqual([1, 2, 3, 255]);
  });
});
