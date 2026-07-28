import { LCG_MULTIPLIER, UINT32_RANGE } from "./constants";

export interface RandomSource {
  next(): number;
}

export class DelphiLcg implements RandomSource {
  private currentState: number;

  constructor(seed: number) {
    this.currentState = seed >>> 0;
  }

  get state(): number {
    return this.currentState;
  }

  reset(seed: number): void {
    this.currentState = seed >>> 0;
  }

  next(): number {
    this.currentState =
      (Math.imul(this.currentState, LCG_MULTIPLIER) + 1) >>> 0;
    return this.currentState / UINT32_RANGE;
  }
}

export class SequenceRandom implements RandomSource {
  private index = 0;

  constructor(
    private readonly values: readonly number[],
    private readonly fallback = 0.999999,
  ) {}

  next(): number {
    const value = this.values[this.index] ?? this.fallback;
    this.index += 1;
    return value;
  }

  get calls(): number {
    return this.index;
  }
}
