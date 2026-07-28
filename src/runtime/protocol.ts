import type {
  Original12Command,
  Original12Config,
  Original12Snapshot,
  ScramReason,
} from "../simulation/models/original12/types";
import type { ModelMetadata } from "../simulation/contract/model";

export const PROTOCOL_VERSION = 1 as const;

export type RunMode = "normal" | "slow";
export type DiagnosticScenario =
  | "detector-high"
  | "detector-high-boundary"
  | "detector-low"
  | "detector-low-boundary"
  | "power-high"
  | "power-boundary"
  | "burnout";

export type UiToWorkerMessage =
  | {
      type: "initialize";
      protocolVersion: typeof PROTOCOL_VERSION;
      modelId: "original-1.2";
      config: Original12Config;
      seed: number;
      autoStart: boolean;
      /**
       * Development-only performance fixture. The UI never supplies this in
       * production builds.
       */
      diagnosticNeutronCount?: number;
      diagnosticScenario?: DiagnosticScenario;
    }
  | {
      type: "runtime-command";
      protocolVersion: typeof PROTOCOL_VERSION;
      commandId: number;
      command:
        | { type: "start" }
        | { type: "pause" }
        | { type: "step-once" }
        | { type: "reset"; config: Original12Config; seed: number }
        | { type: "set-speed"; speed: RunMode }
        | { type: "request-snapshot" }
        | { type: "set-publication-rate"; maximumHz: number };
    }
  | {
      type: "model-command";
      protocolVersion: typeof PROTOCOL_VERSION;
      commandId: number;
      command: Original12Command;
    };

interface VersionedWorkerMessage {
  protocolVersion: typeof PROTOCOL_VERSION;
  modelId: "original-1.2";
  modelVersion: string;
  snapshotSchemaVersion: number;
}

export type WorkerToUiMessage =
  | (VersionedWorkerMessage & {
      type: "ready";
      running: boolean;
      speed: RunMode;
      metadata: ModelMetadata;
      snapshot: Original12Snapshot;
    })
  | (VersionedWorkerMessage & {
      type: "model-state";
      running: boolean;
      speed: RunMode;
      snapshot: Original12Snapshot;
    })
  | (VersionedWorkerMessage & {
      type: "command-result";
      commandId: number;
      accepted: boolean;
      reason?: string;
    })
  | (VersionedWorkerMessage & {
      type: "event";
      event: {
        kind: "scram";
        reason: ScramReason;
        step: number;
        controlRodEnd: number;
        controlRodPercent: number;
        protectionState: "tripped";
      };
    })
  | (VersionedWorkerMessage & {
      type: "fatal-error";
      code: string;
      detail: string;
    });
