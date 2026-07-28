import { useEffect, useRef, useState, type ReactNode } from "react";
import type {
  PointLayer,
  RasterLayer,
} from "../simulation/contract/renderData";
import { createPointRgba, createRgbaRaster } from "./raster";

function sizeCanvas(canvas: HTMLCanvasElement): {
  width: number;
  height: number;
} {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height };
}

export function GridCanvas({
  raster,
  points,
  label,
  overlays,
}: {
  raster: RasterLayer;
  points: PointLayer;
  label: string;
  overlays?: ReactNode;
}) {
  const materialRef = useRef<HTMLCanvasElement>(null);
  const particleRef = useRef<HTMLCanvasElement>(null);
  const [sizeRevision, setSizeRevision] = useState(0);

  useEffect(() => {
    const canvas = materialRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      setSizeRevision((revision) => revision + 1);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = materialRef.current;
    if (!canvas) return;
    const { width, height } = sizeCanvas(canvas);
    const logical = document.createElement("canvas");
    logical.width = raster.width;
    logical.height = raster.height;
    const logicalContext = logical.getContext("2d");
    const context = canvas.getContext("2d");
    if (!logicalContext || !context) return;
    const image = logicalContext.createImageData(
      raster.width,
      raster.height,
    );
    image.data.set(createRgbaRaster(raster));
    logicalContext.putImageData(image, 0, 0);
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);
    context.drawImage(logical, 0, 0, width, height);
  }, [raster, sizeRevision]);

  useEffect(() => {
    const canvas = particleRef.current;
    if (!canvas) return;
    const { width, height } = sizeCanvas(canvas);
    const context = canvas.getContext("2d");
    if (!context) return;
    const logical = document.createElement("canvas");
    logical.width = points.width;
    logical.height = points.height;
    const logicalContext = logical.getContext("2d", {
      willReadFrequently: true,
    });
    if (!logicalContext) return;
    const image = logicalContext.createImageData(points.width, points.height);
    image.data.set(createPointRgba(points));
    logicalContext.putImageData(image, 0, 0);

    context.clearRect(0, 0, width, height);
    context.imageSmoothingEnabled = false;
    context.drawImage(logical, 0, 0, width, height);
  }, [points, sizeRevision]);

  return (
    <div className="reactor-canvas" role="img" aria-label={label}>
      <canvas ref={materialRef} aria-hidden="true" />
      <canvas ref={particleRef} aria-hidden="true" />
      {overlays}
    </div>
  );
}
