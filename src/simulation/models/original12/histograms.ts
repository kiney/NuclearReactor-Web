import {
  GRID_SIZE,
  HISTOGRAM_BAND_MAX,
  HISTOGRAM_BAND_MIN,
  HISTOGRAM_MINIMUM_NORMALIZER,
  HISTOGRAM_WINDOW_STEPS,
} from "./constants";
import type {
  CompletedHistogram,
  HistogramSnapshot,
} from "./types";

interface DirectionWindow {
  fast: Uint32Array;
  slow: Uint32Array;
  fissions: Uint32Array;
  current: CompletedHistogram | null;
  previous: CompletedHistogram | null;
}

const createDirection = (): DirectionWindow => ({
  fast: new Uint32Array(GRID_SIZE),
  slow: new Uint32Array(GRID_SIZE),
  fissions: new Uint32Array(GRID_SIZE),
  current: null,
  previous: null,
});

const complete = (direction: DirectionWindow): void => {
  let maximum = HISTOGRAM_MINIMUM_NORMALIZER;
  for (let i = 0; i < GRID_SIZE; i += 1) {
    maximum = Math.max(maximum, direction.fast[i], direction.slow[i]);
  }
  const fast = new Float32Array(GRID_SIZE);
  const slow = new Float32Array(GRID_SIZE);
  for (let i = 0; i < GRID_SIZE; i += 1) {
    fast[i] = direction.fast[i] / maximum;
    slow[i] = direction.slow[i] / maximum;
  }
  direction.previous = direction.current;
  direction.current = {
    fast,
    slow,
    fissions: direction.fissions.slice(),
    maximum,
  };
  direction.fast.fill(0);
  direction.slow.fill(0);
  direction.fissions.fill(0);
};

export class HistogramCollector {
  private readonly horizontal = createDirection();
  private readonly vertical = createDirection();
  progress = 0;
  revision = 0;

  countNeutron(x: number, y: number, fast: boolean): void {
    const binX = Math.floor(x);
    const binY = Math.floor(y);
    if (
      y >= HISTOGRAM_BAND_MIN &&
      y <= HISTOGRAM_BAND_MAX &&
      binX >= 0 &&
      binX < GRID_SIZE
    ) {
      (fast ? this.horizontal.fast : this.horizontal.slow)[binX] += 1;
    }
    if (
      x >= HISTOGRAM_BAND_MIN &&
      x <= HISTOGRAM_BAND_MAX &&
      binY >= 0 &&
      binY < GRID_SIZE
    ) {
      (fast ? this.vertical.fast : this.vertical.slow)[binY] += 1;
    }
  }

  countFission(x: number, y: number): void {
    const binX = Math.floor(x);
    const binY = Math.floor(y);
    if (
      y >= HISTOGRAM_BAND_MIN &&
      y <= HISTOGRAM_BAND_MAX &&
      binX >= 0 &&
      binX < GRID_SIZE
    ) {
      this.horizontal.fissions[binX] += 1;
    }
    if (
      x >= HISTOGRAM_BAND_MIN &&
      x <= HISTOGRAM_BAND_MAX &&
      binY >= 0 &&
      binY < GRID_SIZE
    ) {
      this.vertical.fissions[binY] += 1;
    }
  }

  finishStep(): void {
    this.progress += 1;
    if (this.progress === HISTOGRAM_WINDOW_STEPS) {
      complete(this.horizontal);
      complete(this.vertical);
      this.progress = 0;
      this.revision += 1;
    }
  }

  reset(): void {
    for (const direction of [this.horizontal, this.vertical]) {
      direction.fast.fill(0);
      direction.slow.fill(0);
      direction.fissions.fill(0);
      direction.current = null;
      direction.previous = null;
    }
    this.progress = 0;
    this.revision += 1;
  }

  snapshots(includeSeries = true): {
    horizontal: HistogramSnapshot;
    vertical: HistogramSnapshot;
  } {
    return {
      horizontal: {
        progress: this.progress,
        current: includeSeries ? this.horizontal.current : null,
        previous: includeSeries ? this.horizontal.previous : null,
      },
      vertical: {
        progress: this.progress,
        current: includeSeries ? this.vertical.current : null,
        previous: includeSeries ? this.vertical.previous : null,
      },
    };
  }
}
