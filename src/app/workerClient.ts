import type { Original12Command, Original12Snapshot } from "../simulation/models/original12/types";
import { DEFAULT_ORIGINAL12_CONFIG } from "../simulation/models/original12/constants";
import type { ModelMetadata } from "../simulation/contract/model";
import {
  PROTOCOL_VERSION,
  type RunMode,
  type DiagnosticScenario,
  type UiToWorkerMessage,
  type WorkerToUiMessage,
} from "../runtime/protocol";

export interface ClientState {
  readonly ready: boolean;
  readonly running: boolean;
  readonly speed: RunMode;
  readonly snapshot: Original12Snapshot | null;
  readonly metadata: ModelMetadata | null;
  readonly lastRejection: { reason: string; commandId: number } | null;
  readonly fatalError: string | null;
}

type Listener = () => void;

export class WorkerClient {
  private worker: Worker;
  private commandId = 0;
  private listeners = new Set<Listener>();
  private state: ClientState = {
    ready: false,
    running: false,
    speed: "normal",
    snapshot: null,
    metadata: null,
    lastRejection: null,
    fatalError: null,
  };

  constructor() {
    this.worker = this.createWorker();
  }

  private createWorker(): Worker {
    const worker = new Worker(
      new URL("../runtime/simulationWorker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = ({ data }: MessageEvent<WorkerToUiMessage>) => {
      if (
        data.protocolVersion !== PROTOCOL_VERSION ||
        (data.type !== "fatal-error" &&
          (data.modelId !== "original-1.2" ||
            data.modelVersion !== "1.0.0" ||
            data.snapshotSchemaVersion !== 1))
      ) {
        this.state = {
          ...this.state,
          running: false,
          fatalError: "incompatible-worker-message",
        };
        this.emit();
        return;
      }
      if (data.type === "ready" || data.type === "model-state") {
        const previous = this.state.snapshot;
        let snapshot =
          previous &&
          data.snapshot.material.length === 0
            ? {
                ...data.snapshot,
                material: previous.material,
                burnout: previous.burnout,
              }
            : data.snapshot;
        if (
          previous &&
          previous.histogramRevision === snapshot.histogramRevision
        ) {
          snapshot = {
            ...snapshot,
            horizontalHistogram: {
              ...snapshot.horizontalHistogram,
              current: previous.horizontalHistogram.current,
              previous: previous.horizontalHistogram.previous,
            },
            verticalHistogram: {
              ...snapshot.verticalHistogram,
              current: previous.verticalHistogram.current,
              previous: previous.verticalHistogram.previous,
            },
          };
        }
        this.state = {
          ...this.state,
          ready: true,
          running: data.running,
          speed: data.speed,
          metadata: data.type === "ready" ? data.metadata : this.state.metadata,
          snapshot,
        };
      } else if (data.type === "command-result" && !data.accepted) {
        this.state = {
          ...this.state,
          lastRejection: {
            reason: data.reason ?? "command-rejected",
            commandId: data.commandId,
          },
        };
        window.setTimeout(() => {
          if (this.state.lastRejection?.commandId === data.commandId) {
            this.state = { ...this.state, lastRejection: null };
            this.emit();
          }
        }, 4_000);
      } else if (data.type === "command-result") {
        this.state = { ...this.state, lastRejection: null };
      } else if (data.type === "event" && this.state.snapshot) {
        this.state = {
          ...this.state,
          snapshot: {
            ...this.state.snapshot,
            controlRodEnd: data.event.controlRodEnd,
            controlRodPercent: data.event.controlRodPercent,
            protectionState: data.event.protectionState,
            lastScram: {
              reason: data.event.reason,
              step: data.event.step,
            },
          },
        };
      } else if (data.type === "fatal-error") {
        this.state = { ...this.state, running: false, fatalError: data.detail };
      }
      this.emit();
    };
    worker.onerror = (event) => {
      this.state = {
        ...this.state,
        running: false,
        fatalError: event.message,
      };
      this.emit();
    };
    return worker;
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ClientState => this.state;

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private nextCommandId(): number {
    this.commandId += 1;
    return this.commandId;
  }

  initialize(
    seed: number,
    autoStart = true,
    diagnosticNeutronCount?: number,
    diagnosticScenario?: DiagnosticScenario,
  ): void {
    const message: UiToWorkerMessage = {
      type: "initialize",
      protocolVersion: PROTOCOL_VERSION,
      modelId: "original-1.2",
      config: DEFAULT_ORIGINAL12_CONFIG,
      seed,
      autoStart,
      ...(import.meta.env.DEV && diagnosticNeutronCount !== undefined
        ? { diagnosticNeutronCount }
        : {}),
      ...(import.meta.env.DEV && diagnosticScenario !== undefined
        ? { diagnosticScenario }
        : {}),
    };
    this.worker.postMessage(message);
  }

  restart(seed: number): void {
    this.worker.terminate();
    this.state = {
      ...this.state,
      ready: false,
      running: false,
      metadata: null,
      lastRejection: null,
      fatalError: null,
    };
    this.worker = this.createWorker();
    this.initialize(seed, true);
    this.emit();
  }

  runtime(
    command:
      | { type: "start" }
      | { type: "pause" }
      | { type: "step-once" }
      | { type: "reset"; seed: number }
      | { type: "set-speed"; speed: RunMode },
  ): void {
    if (
      command.type === "start" ||
      command.type === "pause" ||
      command.type === "reset"
    ) {
      this.state = {
        ...this.state,
        running: command.type !== "pause",
        ...(command.type === "reset" ? { speed: "normal" as const } : {}),
      };
      this.emit();
    }
    const workerCommand =
      command.type === "reset"
        ? { ...command, config: DEFAULT_ORIGINAL12_CONFIG }
        : command;
    this.worker.postMessage({
      type: "runtime-command",
      protocolVersion: PROTOCOL_VERSION,
      commandId: this.nextCommandId(),
      command: workerCommand,
    } satisfies UiToWorkerMessage);
  }

  requestFullSnapshot(): void {
    this.worker.postMessage({
      type: "runtime-command",
      protocolVersion: PROTOCOL_VERSION,
      commandId: this.nextCommandId(),
      command: { type: "request-snapshot" },
    } satisfies UiToWorkerMessage);
  }

  setMaximumPublicationRate(maximumHz: number): void {
    this.worker.postMessage({
      type: "runtime-command",
      protocolVersion: PROTOCOL_VERSION,
      commandId: this.nextCommandId(),
      command: { type: "set-publication-rate", maximumHz },
    } satisfies UiToWorkerMessage);
  }

  model(command: Original12Command): void {
    this.worker.postMessage({
      type: "model-command",
      protocolVersion: PROTOCOL_VERSION,
      commandId: this.nextCommandId(),
      command,
    } satisfies UiToWorkerMessage);
  }

  dispose(): void {
    this.worker.terminate();
  }
}
