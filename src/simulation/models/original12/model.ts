import type {
  CommandResult,
  SimulationModel,
} from "../../contract/model";
import {
  BACKGROUND_EMISSION_PROBABILITY,
  CONTROL_ROD_STARTS,
  CORE_MIN,
  DEFAULT_ORIGINAL12_CONFIG,
  DETECTOR_HIGH_SCRAM_PERCENT,
  DETECTOR_LOW_SCRAM_PERCENT,
  DETECTOR_RANGES,
  DETECTOR_WARNING_PERCENT,
  FAST_ABSORBER_ABSORPTION_PROBABILITY,
  FISSION_CHILD_COUNT,
  FISSION_PROBABILITY_FACTOR,
  FUEL_ABSORPTION_PROBABILITY_FACTOR,
  GRID_CELLS,
  GRID_SIZE,
  INITIAL_NEUTRON_COUNT,
  MATERIAL,
  MAX_BURNOUT,
  MAX_NEUTRONS,
  MODEL_METADATA,
  MODERATION_PROBABILITY,
  MODERATOR_ABSORPTION_PROBABILITY,
  MOVEMENT_LIMIT,
  POWER_ACTIVITY_FACTOR,
  POWER_DECAY_FACTOR,
  POWER_SCRAM_THRESHOLD,
  PERCENT_SCALE,
  ROD_INSERTED_END,
  ROD_STEP,
  ROD_WITHDRAWN_END,
  SAFETY_ROD_STARTS,
  SCATTER_COMPONENT_OFFSET,
  SCATTER_COMPONENT_SCALE,
  SOURCE_X,
  SOURCE_Y,
  SOURCE_EMISSION_PROBABILITY,
} from "./constants";
import { createInitialMaterial, rebuildMaterial } from "./geometry";
import { HistogramCollector } from "./histograms";
import { NeutronPool } from "./neutronPool";
import { DelphiLcg, type RandomSource } from "./rng";
import type {
  Original12Command,
  Original12Config,
  Original12Snapshot,
  ProtectionState,
  ScramReason,
} from "./types";

interface MutableState {
  seed: number;
  step: number;
  controlRodEnd: number;
  protectionState: ProtectionState;
  sourceEnabled: boolean;
  reflectorEnabled: boolean;
  moderatorDrained: boolean;
  burnoutEnabled: boolean;
  detectorRangeIndex: number;
  detectorPercent: number;
  detectorWarning: boolean;
  power: number;
  fissionsThisStep: number;
  fissionsTotal: number;
  lastScram: { reason: ScramReason; step: number } | null;
  saturatedEmissions: number;
  materialRevision: number;
}

const initialState = (seed: number): MutableState => ({
  seed: seed >>> 0,
  step: 0,
  controlRodEnd: ROD_INSERTED_END,
  protectionState: "inserted",
  sourceEnabled: false,
  reflectorEnabled: false,
  moderatorDrained: false,
  burnoutEnabled: false,
  detectorRangeIndex: 0,
  detectorPercent: 0,
  detectorWarning: false,
  power: 0,
  fissionsThisStep: 0,
  fissionsTotal: 0,
  lastScram: null,
  saturatedEmissions: 0,
  materialRevision: 0,
});

export class Original12Model
  implements
    SimulationModel<Original12Command, Original12Snapshot, Original12Config>
{
  readonly metadata = MODEL_METADATA;
  private state: MutableState;
  private rng: RandomSource;
  private readonly ownsRng: boolean;
  private material = createInitialMaterial();
  private readonly burnout = new Uint8Array(GRID_CELLS);
  private readonly neutrons = new NeutronPool();
  private histograms = new HistogramCollector();

  constructor(seed: number, randomSource?: RandomSource) {
    this.state = initialState(seed);
    this.rng = randomSource ?? new DelphiLcg(seed);
    this.ownsRng = randomSource === undefined;
    this.createStartingNeutrons();
  }

  private createStartingNeutrons(): void {
    for (let i = 0; i < INITIAL_NEUTRON_COUNT; i += 1) {
      const x = this.rng.next() * MOVEMENT_LIMIT;
      const y = this.rng.next() * MOVEMENT_LIMIT;
      this.neutrons.addRandomDirection(x, y, true, this.rng);
    }
  }

  initialize(config: Original12Config, seed: number): void {
    this.reset(config, seed);
  }

  reset(seed: number): void;
  reset(config: Original12Config, seed: number): void;
  reset(
    configOrSeed: Original12Config | number,
    explicitSeed?: number,
  ): void {
    const config =
      typeof configOrSeed === "number"
        ? DEFAULT_ORIGINAL12_CONFIG
        : configOrSeed;
    const seed =
      typeof configOrSeed === "number" ? configOrSeed : explicitSeed;
    if (
      config.profile !== DEFAULT_ORIGINAL12_CONFIG.profile ||
      seed === undefined
    ) {
      throw new Error("invalid-original-1.2-configuration");
    }
    this.state = initialState(seed);
    if (this.ownsRng) {
      this.rng = new DelphiLcg(seed);
    } else if ("reset" in this.rng && typeof this.rng.reset === "function") {
      this.rng.reset(seed);
    }
    this.material = createInitialMaterial();
    this.burnout.fill(0);
    this.neutrons.clear();
    this.histograms = new HistogramCollector();
    this.createStartingNeutrons();
  }

  dispose(): void {}

  private rebuildGeometry(): void {
    rebuildMaterial(this.material, {
      controlRodEnd: this.state.controlRodEnd,
      safetyRodsWithdrawn: this.state.protectionState === "armed",
      replacementMaterial: this.state.moderatorDrained
        ? MATERIAL.EMPTY
        : MATERIAL.MODERATOR,
      reflectorEnabled: this.state.reflectorEnabled,
      sourceEnabled: this.state.sourceEnabled,
    });
    this.state.materialRevision += 1;
  }

  private scram(reason: ScramReason): void {
    if (this.state.protectionState === "tripped" && reason !== "manual") return;
    this.state.controlRodEnd = ROD_INSERTED_END;
    this.state.protectionState = "tripped";
    this.state.lastScram = { reason, step: this.state.step };
    this.rebuildGeometry();
  }

  applyCommand(command: Original12Command): CommandResult {
    switch (command.type) {
      case "move-control-rods": {
        if (
          command.direction === "out" &&
          this.state.protectionState !== "armed"
        ) {
          return { accepted: false, reason: "safety-circuit-not-armed" };
        }
        const delta = command.direction === "out" ? -ROD_STEP : ROD_STEP;
        const next = Math.max(
          ROD_WITHDRAWN_END,
          Math.min(ROD_INSERTED_END, this.state.controlRodEnd + delta),
        );
        if (next === this.state.controlRodEnd) {
          return { accepted: false, reason: "control-rod-end-stop" };
        }
        this.state.controlRodEnd = next;
        this.rebuildGeometry();
        return { accepted: true };
      }
      case "withdraw-safety-rods":
        if (this.state.detectorRangeIndex !== 0) {
          return { accepted: false, reason: "detector-range-must-be-100" };
        }
        if (this.state.protectionState === "armed") {
          return { accepted: false, reason: "safety-rods-already-withdrawn" };
        }
        this.state.protectionState = "armed";
        this.rebuildGeometry();
        return { accepted: true };
      case "scram":
        this.scram("manual");
        return { accepted: true };
      case "set-source":
        if (this.state.sourceEnabled !== command.enabled) {
          this.state.sourceEnabled = command.enabled;
          this.rebuildGeometry();
        }
        return { accepted: true };
      case "set-reflector":
        if (this.state.reflectorEnabled !== command.enabled) {
          this.state.reflectorEnabled = command.enabled;
          this.rebuildGeometry();
        }
        return { accepted: true };
      case "drain-moderator":
        if (this.state.moderatorDrained) {
          return { accepted: false, reason: "moderator-already-drained" };
        }
        this.state.moderatorDrained = true;
        this.state.reflectorEnabled = false;
        this.rebuildGeometry();
        return { accepted: true };
      case "set-burnout":
        if (this.state.burnoutEnabled !== command.enabled) {
          this.state.burnoutEnabled = command.enabled;
          this.state.materialRevision += 1;
        }
        return { accepted: true };
      case "change-range": {
        const delta = command.direction === "higher" ? 1 : -1;
        const next = this.state.detectorRangeIndex + delta;
        if (next < 0 || next >= DETECTOR_RANGES.length) {
          return { accepted: false, reason: "detector-range-end-stop" };
        }
        this.state.detectorRangeIndex = next;
        this.updateDetector(this.neutrons.count);
        return { accepted: true };
      }
      case "reset-histograms":
        this.histograms.reset();
        return { accepted: true };
    }
  }

  private updateDetector(countAtStepStart: number): void {
    const maximum = DETECTOR_RANGES[this.state.detectorRangeIndex];
    this.state.detectorPercent = Math.trunc(
      (PERCENT_SCALE * Math.min(countAtStepStart, maximum)) / maximum,
    );
    if (this.state.detectorPercent > DETECTOR_WARNING_PERCENT) {
      this.state.detectorWarning = true;
    }
    if (this.state.detectorPercent < DETECTOR_WARNING_PERCENT) {
      this.state.detectorWarning = false;
    }
  }

  private checkDetectorProtection(): void {
    if (this.state.protectionState !== "armed") return;
    const maximum = DETECTOR_RANGES[this.state.detectorRangeIndex];
    if (this.state.detectorPercent > DETECTOR_HIGH_SCRAM_PERCENT) {
      this.scram("detector-high");
    } else if (
      this.state.detectorPercent < DETECTOR_LOW_SCRAM_PERCENT &&
      maximum > DETECTOR_RANGES[0]
    ) {
      this.scram("detector-low-range");
    }
  }

  private checkPowerProtection(): void {
    if (
      this.state.protectionState === "armed" &&
      this.state.power > POWER_SCRAM_THRESHOLD
    ) {
      this.scram("power-high");
    }
  }

  private addEmission(x: number, y: number): void {
    if (this.neutrons.count >= MAX_NEUTRONS) {
      this.state.saturatedEmissions += 1;
      return;
    }
    this.neutrons.addRandomDirection(x, y, true, this.rng);
  }

  private assertFiniteState(): void {
    const scalarValues = [
      this.state.step,
      this.state.controlRodEnd,
      this.state.detectorPercent,
      this.state.power,
      this.state.fissionsThisStep,
      this.state.fissionsTotal,
      this.state.saturatedEmissions,
    ];
    if (scalarValues.some((value) => !Number.isFinite(value))) {
      throw new Error("non-finite-model-state");
    }
    for (let index = 0; index < this.neutrons.count; index += 1) {
      if (
        !Number.isFinite(this.neutrons.x[index]) ||
        !Number.isFinite(this.neutrons.y[index]) ||
        !Number.isFinite(this.neutrons.dx[index]) ||
        !Number.isFinite(this.neutrons.dy[index])
      ) {
        throw new Error("non-finite-neutron-state");
      }
    }
  }

  step(): void {
    this.state.fissionsThisStep = 0;
    let activity = 0;
    const countAtStepStart = this.neutrons.count;

    for (let i = 0; i < countAtStepStart; i += 1) {
      this.histograms.countNeutron(
        this.neutrons.x[i],
        this.neutrons.y[i],
        this.neutrons.fast[i] === 1,
      );

      const oldX = Math.floor(this.neutrons.x[i]);
      const oldY = Math.floor(this.neutrons.y[i]);
      if (
        this.neutrons.fast[i] === 1 &&
        oldX >= 0 &&
        oldX < GRID_SIZE &&
        oldY >= 0 &&
        oldY < GRID_SIZE &&
        this.material[oldY * GRID_SIZE + oldX] !== MATERIAL.EMPTY
      ) {
        this.neutrons.dx[i] =
          SCATTER_COMPONENT_SCALE * this.rng.next() -
          SCATTER_COMPONENT_OFFSET;
        this.neutrons.dy[i] =
          SCATTER_COMPONENT_SCALE * this.rng.next() -
          SCATTER_COMPONENT_OFFSET;
      }

      this.neutrons.x[i] += this.neutrons.dx[i];
      this.neutrons.y[i] += this.neutrons.dy[i];
      if (
        this.neutrons.x[i] < 0 ||
        this.neutrons.x[i] >= MOVEMENT_LIMIT ||
        this.neutrons.y[i] < 0 ||
        this.neutrons.y[i] >= MOVEMENT_LIMIT
      ) {
        this.neutrons.active[i] = 0;
      }
    }

    this.updateDetector(countAtStepStart);
    this.checkDetectorProtection();

    for (let i = 0; i < countAtStepStart; i += 1) {
      if (this.neutrons.active[i] === 0) continue;
      const x = Math.floor(this.neutrons.x[i]);
      const y = Math.floor(this.neutrons.y[i]);
      const cellIndex = y * GRID_SIZE + x;
      const material = this.material[cellIndex];

      if (material === MATERIAL.MODERATOR) {
        if (
          this.neutrons.fast[i] === 1 &&
          this.rng.next() < MODERATION_PROBABILITY
        ) {
          this.neutrons.fast[i] = 0;
        }
        if (this.rng.next() < MODERATOR_ABSORPTION_PROBABILITY) {
          this.neutrons.active[i] = 0;
        }
      } else if (
        material === MATERIAL.FUEL &&
        this.neutrons.fast[i] === 0
      ) {
        activity += 1;
        const localBurnout = this.burnout[cellIndex];
        const fissionProbability =
          FISSION_PROBABILITY_FACTOR * (MAX_BURNOUT - localBurnout);
        if (this.rng.next() < fissionProbability) {
          const fissionX = this.neutrons.x[i];
          const fissionY = this.neutrons.y[i];
          this.neutrons.active[i] = 0;
          for (let child = 0; child < FISSION_CHILD_COUNT; child += 1) {
            if (this.neutrons.count >= MAX_NEUTRONS) {
              this.state.saturatedEmissions += 1;
            } else {
              this.neutrons.addRandomDirection(
                fissionX,
                fissionY,
                true,
                this.rng,
              );
            }
          }
          this.state.fissionsThisStep += 1;
          this.state.fissionsTotal += 1;
          this.histograms.countFission(fissionX, fissionY);
          if (
            this.state.burnoutEnabled &&
            localBurnout < MAX_BURNOUT
          ) {
            this.burnout[cellIndex] = localBurnout + 1;
            this.state.materialRevision += 1;
          }
        } else if (
          this.rng.next() <
          FUEL_ABSORPTION_PROBABILITY_FACTOR * localBurnout
        ) {
          this.neutrons.active[i] = 0;
        }
      } else if (material === MATERIAL.ABSORBER) {
        if (
          this.neutrons.fast[i] === 0 ||
          this.rng.next() < FAST_ABSORBER_ABSORPTION_PROBABILITY
        ) {
          this.neutrons.active[i] = 0;
        }
      }
    }

    if (
      this.state.sourceEnabled &&
      this.rng.next() < SOURCE_EMISSION_PROBABILITY
    ) {
      this.addEmission(SOURCE_X, SOURCE_Y);
    }
    if (this.rng.next() < BACKGROUND_EMISSION_PROBABILITY) {
      if (this.neutrons.count >= MAX_NEUTRONS) {
        this.state.saturatedEmissions += 1;
      } else {
        const x = this.rng.next() * MOVEMENT_LIMIT;
        const y = this.rng.next() * MOVEMENT_LIMIT;
        this.addEmission(x, y);
      }
    }

    this.neutrons.compact();
    this.state.power =
      POWER_DECAY_FACTOR * this.state.power +
      POWER_ACTIVITY_FACTOR * activity;
    this.checkPowerProtection();
    this.histograms.finishStep();
    this.state.step += 1;
    if (import.meta.env.MODE !== "production") this.assertFiniteState();
  }

  createSnapshot(kind: "full" | "telemetry" = "full"): Original12Snapshot {
    let fastNeutronCount = 0;
    for (let i = 0; i < this.neutrons.count; i += 1) {
      fastNeutronCount += this.neutrons.fast[i];
    }
    const histogramSnapshots = this.histograms.snapshots(kind === "full");
    return {
      modelId: "original-1.2",
      modelVersion: MODEL_METADATA.modelVersion,
      snapshotSchemaVersion: MODEL_METADATA.snapshotSchemaVersion,
      seed: this.state.seed,
      configuration: DEFAULT_ORIGINAL12_CONFIG,
      rngState: this.rng instanceof DelphiLcg ? this.rng.state : null,
      step: this.state.step,
      neutronCount: this.neutrons.count,
      fastNeutronCount,
      slowNeutronCount: this.neutrons.count - fastNeutronCount,
      controlRodEnd: this.state.controlRodEnd,
      controlRodPercent:
        ((ROD_INSERTED_END - this.state.controlRodEnd) /
          (ROD_INSERTED_END - CORE_MIN)) *
          PERCENT_SCALE,
      protectionState: this.state.protectionState,
      sourceEnabled: this.state.sourceEnabled,
      reflectorEnabled: this.state.reflectorEnabled,
      moderatorDrained: this.state.moderatorDrained,
      burnoutEnabled: this.state.burnoutEnabled,
      detectorRangeIndex: this.state.detectorRangeIndex + 2,
      detectorMaximum: DETECTOR_RANGES[this.state.detectorRangeIndex],
      detectorPercent: this.state.detectorPercent,
      detectorWarning: this.state.detectorWarning,
      power: this.state.power,
      fissionsThisStep: this.state.fissionsThisStep,
      fissionsTotal: this.state.fissionsTotal,
      lastScram: this.state.lastScram,
      saturatedEmissions: this.state.saturatedEmissions,
      materialRevision: this.state.materialRevision,
      histogramRevision: this.histograms.revision,
      material:
        kind === "full" ? this.material.slice() : new Uint8Array(0),
      burnout:
        kind === "full" ? this.burnout.slice() : new Uint8Array(0),
      neutronX:
        this.neutrons.x.slice(0, this.neutrons.count),
      neutronY:
        this.neutrons.y.slice(0, this.neutrons.count),
      neutronFast:
        this.neutrons.fast.slice(0, this.neutrons.count),
      horizontalHistogram: histogramSnapshots.horizontal,
      verticalHistogram: histogramSnapshots.vertical,
    };
  }

  /**
   * Deterministic test setup without exposing mutable state to production UI.
   * Tests use this to force boundary cases from the specification.
   */
  setTestNeutrons(
    entries: ReadonlyArray<{
      x: number;
      y: number;
      dx: number;
      dy: number;
      fast: boolean;
    }>,
  ): void {
    this.neutrons.clear();
    for (const entry of entries) {
      this.neutrons.add(
        entry.x,
        entry.y,
        entry.dx,
        entry.dy,
        entry.fast,
      );
    }
  }

  fillTestNeutrons(
    count: number,
    entry: {
      x: number;
      y: number;
      dx: number;
      dy: number;
      fast: boolean;
    } = { x: 10, y: 10, dx: 0, dy: 0, fast: true },
  ): void {
    this.neutrons.clear();
    for (let index = 0; index < count; index += 1) {
      this.neutrons.add(
        entry.x,
        entry.y,
        entry.dx,
        entry.dy,
        entry.fast,
      );
    }
  }

  appendTestNeutron(entry: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    fast: boolean;
  }): void {
    this.neutrons.add(
      entry.x,
      entry.y,
      entry.dx,
      entry.dy,
      entry.fast,
    );
  }

  setTestPower(power: number): void {
    this.state.power = power;
  }

  setTestBurnout(x: number, y: number, value: number): void {
    this.burnout[y * GRID_SIZE + x] = value;
  }
}

export const originalRodStarts = {
  safety: SAFETY_ROD_STARTS,
  control: CONTROL_ROD_STARTS,
};

export function isPriorityOriginal12Command(
  command: Original12Command,
): boolean {
  return command.type === "scram";
}
