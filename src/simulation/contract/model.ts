export interface ModelMetadata {
  readonly id: string;
  readonly modelVersion: string;
  readonly snapshotSchemaVersion: number;
  readonly name: string;
  readonly grid: { readonly width: number; readonly height: number };
  readonly runModes: ReadonlyArray<{
    readonly id: string;
    readonly periodMs: number;
  }>;
  readonly capabilities: ReadonlyArray<string>;
  readonly render: {
    readonly cellStyles: ReadonlyArray<{
      readonly id: number;
      readonly color: readonly [number, number, number, number?];
    }>;
    readonly pointCategories: ReadonlyArray<{
      readonly id: string;
      readonly color: string;
    }>;
  };
}

export interface CommandResult {
  readonly accepted: boolean;
  readonly reason?: string;
}

export interface SimulationModel<TCommand, TSnapshot, TConfig = unknown> {
  readonly metadata: ModelMetadata;
  initialize(config: TConfig, seed: number): void;
  applyCommand(command: TCommand): CommandResult;
  step(): void;
  createSnapshot(kind?: "full" | "telemetry"): TSnapshot;
  reset(config: TConfig, seed: number): void;
  dispose(): void;
}
