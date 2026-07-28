export interface CellStyle {
  readonly id: number;
  readonly color: readonly [number, number, number, number?];
}

export interface RasterLayer {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;
  readonly styles: ReadonlyArray<CellStyle>;
  readonly rgbaOverride?: Uint8ClampedArray;
  readonly revision: number;
}

export interface PointCategory {
  readonly id: string;
  readonly color: string;
  readonly x: Float32Array;
  readonly y: Float32Array;
}

export interface PointLayer {
  readonly width: number;
  readonly height: number;
  readonly categories: ReadonlyArray<PointCategory>;
  readonly revision: number;
}
