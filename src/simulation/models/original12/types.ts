export type ProtectionState = "inserted" | "armed" | "tripped";
export interface Original12Config {
  readonly profile: "original-1.2-default";
}
export type ScramReason =
  | "manual"
  | "detector-high"
  | "detector-low-range"
  | "power-high";

export type Original12Command =
  | { type: "move-control-rods"; direction: "in" | "out" }
  | { type: "withdraw-safety-rods" }
  | { type: "scram" }
  | { type: "set-source"; enabled: boolean }
  | { type: "set-reflector"; enabled: boolean }
  | { type: "drain-moderator" }
  | { type: "set-burnout"; enabled: boolean }
  | { type: "change-range"; direction: "higher" | "lower" }
  | { type: "reset-histograms" };

export interface CompletedHistogram {
  readonly fast: Float32Array;
  readonly slow: Float32Array;
  readonly fissions: Uint32Array;
  readonly maximum: number;
}

export interface HistogramSnapshot {
  readonly progress: number;
  readonly current: CompletedHistogram | null;
  readonly previous: CompletedHistogram | null;
}

export interface Original12Snapshot {
  readonly modelId: "original-1.2";
  readonly modelVersion: string;
  readonly snapshotSchemaVersion: number;
  readonly seed: number;
  readonly configuration: Original12Config;
  readonly rngState: number | null;
  readonly step: number;
  readonly neutronCount: number;
  readonly fastNeutronCount: number;
  readonly slowNeutronCount: number;
  readonly controlRodEnd: number;
  readonly controlRodPercent: number;
  readonly protectionState: ProtectionState;
  readonly sourceEnabled: boolean;
  readonly reflectorEnabled: boolean;
  readonly moderatorDrained: boolean;
  readonly burnoutEnabled: boolean;
  readonly detectorRangeIndex: number;
  readonly detectorMaximum: number;
  readonly detectorPercent: number;
  readonly detectorWarning: boolean;
  readonly power: number;
  readonly fissionsThisStep: number;
  readonly fissionsTotal: number;
  readonly lastScram: { readonly reason: ScramReason; readonly step: number } | null;
  readonly saturatedEmissions: number;
  readonly materialRevision: number;
  readonly histogramRevision: number;
  readonly material: Uint8Array;
  readonly burnout: Uint8Array;
  readonly neutronX: Float32Array;
  readonly neutronY: Float32Array;
  readonly neutronFast: Uint8Array;
  readonly horizontalHistogram: HistogramSnapshot;
  readonly verticalHistogram: HistogramSnapshot;
}
