import { useEffect, useRef, useState } from "react";

export interface HistogramWindow {
  readonly fast: Float32Array;
  readonly slow: Float32Array;
  readonly fissions: Uint32Array;
  readonly maximum: number;
}

export interface HistogramRenderData {
  readonly current: HistogramWindow | null;
  readonly previous: HistogramWindow | null;
}

export interface HistogramVisibility {
  readonly fast: boolean;
  readonly slow: boolean;
  readonly fissions: boolean;
  readonly current: boolean;
  readonly previous: boolean;
}

export function HistogramCanvas({
  histogram,
  vertical,
  summary,
  visibility,
}: {
  histogram: HistogramRenderData;
  vertical: boolean;
  summary: string;
  visibility: HistogramVisibility;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [sizeRevision, setSizeRevision] = useState(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      setSizeRevision((revision) => revision + 1);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const context = canvas.getContext("2d");
    if (!context) return;
    const { width, height } = canvas;
    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#cbd5e1";
    context.strokeRect(0, 0, width, height);

    const draw = (
      values: ArrayLike<number>,
      color: string,
      alpha: number,
      normalizer = 1,
      dashed = false,
    ): void => {
      context.beginPath();
      context.strokeStyle = color;
      context.globalAlpha = alpha;
      context.lineWidth = Math.max(1, dpr);
      context.setLineDash(dashed ? [4 * dpr, 3 * dpr] : []);
      for (let index = 0; index < values.length; index += 1) {
        const binPosition = index / (values.length - 1);
        const normalized = values[index] / normalizer;
        const x = vertical ? normalized * width : binPosition * width;
        const y = vertical
          ? binPosition * height
          : height - normalized * height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    };

    const drawWindow = (
      window: HistogramWindow,
      alpha: number,
    ) => {
      if (visibility.fast) draw(window.fast, "#e5484d", alpha);
      if (visibility.slow) draw(window.slow, "#101828", alpha);
      if (visibility.fissions) {
        let maximum = 1;
        for (const value of window.fissions) maximum = Math.max(maximum, value);
        draw(window.fissions, "#7c3aed", alpha, maximum, true);
      }
    };

    if (histogram.previous && visibility.previous) {
      drawWindow(histogram.previous, 0.25);
    }
    if (histogram.current && visibility.current) {
      drawWindow(histogram.current, 1);
    }
    context.globalAlpha = 1;
    context.setLineDash([]);
  }, [
    histogram.current,
    histogram.previous,
    sizeRevision,
    vertical,
    visibility,
  ]);

  return (
    <>
      <canvas ref={ref} className="histogram-canvas" aria-hidden="true" />
      <p className="sr-only">{summary}</p>
    </>
  );
}
