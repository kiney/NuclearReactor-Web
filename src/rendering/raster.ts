import type {
  PointLayer,
  RasterLayer,
} from "../simulation/contract/renderData";

export function createRgbaRaster(layer: RasterLayer): Uint8ClampedArray {
  if (layer.cells.length !== layer.width * layer.height) {
    throw new Error("raster-size-mismatch");
  }
  if (layer.rgbaOverride) {
    if (layer.rgbaOverride.length !== layer.cells.length * 4) {
      throw new Error("rgba-override-size-mismatch");
    }
    return layer.rgbaOverride;
  }
  const lookup = new Map(layer.styles.map((style) => [style.id, style.color]));
  const rgba = new Uint8ClampedArray(layer.cells.length * 4);
  for (let index = 0; index < layer.cells.length; index += 1) {
    const color = lookup.get(layer.cells[index]) ?? [0, 0, 0, 0];
    const offset = index * 4;
    rgba[offset] = color[0];
    rgba[offset + 1] = color[1];
    rgba[offset + 2] = color[2];
    rgba[offset + 3] = color[3] ?? 255;
  }
  return rgba;
}

function parseHexColor(color: string): readonly [number, number, number, number] {
  const match = /^#([\da-f]{6})([\da-f]{2})?$/i.exec(color);
  if (!match) throw new Error(`unsupported-point-color:${color}`);
  const value = Number.parseInt(match[1], 16);
  return [
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
    match[2] ? Number.parseInt(match[2], 16) : 255,
  ];
}

export function createPointRgba(layer: PointLayer): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(layer.width * layer.height * 4);
  for (const category of layer.categories) {
    const color = parseHexColor(category.color);
    const length = Math.min(category.x.length, category.y.length);
    for (let index = 0; index < length; index += 1) {
      const x = Math.floor(category.x[index]);
      const y = Math.floor(category.y[index]);
      if (x < 0 || x >= layer.width || y < 0 || y >= layer.height) continue;
      const offset = (y * layer.width + x) * 4;
      rgba[offset] = color[0];
      rgba[offset + 1] = color[1];
      rgba[offset + 2] = color[2];
      rgba[offset + 3] = color[3];
    }
  }
  return rgba;
}
