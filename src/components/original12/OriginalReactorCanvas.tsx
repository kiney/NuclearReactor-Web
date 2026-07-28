import { useMemo } from "react";
import { GridCanvas } from "../../rendering/GridCanvas";
import type {
  PointLayer,
  RasterLayer,
} from "../../simulation/contract/renderData";
import {
  GRID_SIZE,
  MAX_BURNOUT,
  MATERIAL,
  MODEL_METADATA,
} from "../../simulation/models/original12/constants";
import type { Original12Snapshot } from "../../simulation/models/original12/types";

const styles: RasterLayer["styles"] = MODEL_METADATA.render.cellStyles;
// Dense runs contain many particles in the same logical pixel. This limit
// changes only the deterministic visual sample, never model state or counters.
const MAX_VISIBLE_NEUTRONS = 2_000;

export function createOriginalRasterLayer(
  snapshot: Original12Snapshot,
): RasterLayer {
  let rgbaOverride: Uint8ClampedArray | undefined;
  if (snapshot.burnoutEnabled) {
    const lookup = new Map(styles.map((style) => [style.id, style.color]));
    rgbaOverride = new Uint8ClampedArray(snapshot.material.length * 4);
    for (let index = 0; index < snapshot.material.length; index += 1) {
      const material = snapshot.material[index];
      let color = lookup.get(material) ?? [248, 250, 252];
      if (material === MATERIAL.FUEL && snapshot.burnout[index] > 0) {
        const fraction = snapshot.burnout[index] / MAX_BURNOUT;
        color = [
          Math.round(46 + (11 - 46) * fraction),
          Math.round(173 + (85 - 173) * fraction),
          Math.round(98 + (47 - 98) * fraction),
        ];
      }
      const offset = index * 4;
      rgbaOverride[offset] = color[0];
      rgbaOverride[offset + 1] = color[1];
      rgbaOverride[offset + 2] = color[2];
      rgbaOverride[offset + 3] = 255;
    }
  }
  return {
    width: GRID_SIZE,
    height: GRID_SIZE,
    cells: snapshot.material,
    styles,
    rgbaOverride,
    revision: snapshot.materialRevision,
  };
}

export function createOriginalPointLayer(
  snapshot: Original12Snapshot,
): PointLayer {
  const pointCount = Math.min(
    snapshot.neutronX.length,
    snapshot.neutronY.length,
    snapshot.neutronFast.length,
  );
  const stride = Math.max(1, Math.ceil(pointCount / MAX_VISIBLE_NEUTRONS));
  let fastCount = 0;
  let visibleCount = 0;
  for (let index = 0; index < pointCount; index += stride) {
    fastCount += snapshot.neutronFast[index];
    visibleCount += 1;
  }
  const fastX = new Float32Array(fastCount);
  const fastY = new Float32Array(fastCount);
  const slowX = new Float32Array(visibleCount - fastCount);
  const slowY = new Float32Array(visibleCount - fastCount);
  let fastIndex = 0;
  let slowIndex = 0;
  for (let index = 0; index < pointCount; index += stride) {
    if (snapshot.neutronFast[index] === 1) {
      fastX[fastIndex] = snapshot.neutronX[index];
      fastY[fastIndex] = snapshot.neutronY[index];
      fastIndex += 1;
    } else {
      slowX[slowIndex] = snapshot.neutronX[index];
      slowY[slowIndex] = snapshot.neutronY[index];
      slowIndex += 1;
    }
  }
  return {
    width: GRID_SIZE,
    height: GRID_SIZE,
    revision: snapshot.step,
    categories: [
      {
        ...MODEL_METADATA.render.pointCategories[0],
        x: fastX,
        y: fastY,
      },
      {
        ...MODEL_METADATA.render.pointCategories[1],
        x: slowX,
        y: slowY,
      },
    ],
  };
}

export function OriginalReactorCanvas({
  snapshot,
  label,
  showBands,
}: {
  snapshot: Original12Snapshot;
  label: string;
  showBands: boolean;
}) {
  const raster = useMemo(
    () => createOriginalRasterLayer(snapshot),
    [
      snapshot.burnout,
      snapshot.burnoutEnabled,
      snapshot.material,
      snapshot.materialRevision,
    ],
  );
  const points = useMemo(
    () => createOriginalPointLayer(snapshot),
    [
      snapshot.neutronCount,
      snapshot.neutronFast,
      snapshot.neutronX,
      snapshot.neutronY,
    ],
  );
  return (
    <GridCanvas
      raster={raster}
      points={points}
      label={label}
      overlays={
        showBands ? (
          <>
            <span className="measurement-band horizontal-band" />
            <span className="measurement-band vertical-band" />
          </>
        ) : null
      }
    />
  );
}
