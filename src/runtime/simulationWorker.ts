/// <reference lib="webworker" />

import { createModel } from "../simulation/modelFactory";
import type { ModelMetadata } from "../simulation/contract/model";
import { isPriorityOriginal12Command } from "../simulation/models/original12/model";
import type {
  Original12Command,
  Original12Config,
  Original12Snapshot,
} from "../simulation/models/original12/types";
import { ModelHost } from "./modelHost";
import {
  PROTOCOL_VERSION,
  type RunMode,
  type UiToWorkerMessage,
  type WorkerToUiMessage,
} from "./protocol";

const workerScope: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

let host: ModelHost<
  Original12Command,
  Original12Snapshot,
  Original12Config
> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let speed: RunMode = "normal";
let runPeriods = new Map<string, number>();
let activeVersion: {
  modelId: "original-1.2";
  modelVersion: string;
  snapshotSchemaVersion: number;
} | null = null;
let activeMetadata: ModelMetadata | null = null;
let lastPublication = 0;
let lastGridRevision = -1;
let lastHistogramRevision = -1;
let lastEventKey = "";
let publicationIntervalMs = 50;
let requestedPublicationIntervalMs = 50;
let schedulerMinimumDelayMs = 0;
const HIGH_LOAD_NEUTRON_THRESHOLD = 50_000;
const HIGH_LOAD_YIELD_MS = 250;

function version() {
  if (!activeVersion) throw new Error("worker-not-initialized");
  return { protocolVersion: PROTOCOL_VERSION, ...activeVersion } as const;
}

function post(message: WorkerToUiMessage): void {
  if (message.type === "ready" || message.type === "model-state") {
    const candidates = [
      message.snapshot.material.buffer,
      message.snapshot.burnout.buffer,
      message.snapshot.neutronX.buffer,
      message.snapshot.neutronY.buffer,
      message.snapshot.neutronFast.buffer,
    ];
    const transfer = candidates.filter(
      (buffer): buffer is ArrayBuffer =>
        buffer instanceof ArrayBuffer && buffer.byteLength > 0,
    );
    workerScope.postMessage(message, transfer);
  } else {
    workerScope.postMessage(message);
  }
}

function publish(
  type: "ready" | "model-state" = "model-state",
  forceFull = false,
): void {
  if (!host) return;
  const now = performance.now();
  let snapshot = host.snapshot("telemetry");
  if (
    type === "ready" ||
    forceFull ||
    snapshot.materialRevision !== lastGridRevision ||
    snapshot.histogramRevision !== lastHistogramRevision
  ) {
    snapshot = host.snapshot("full");
    lastGridRevision = snapshot.materialRevision;
    lastHistogramRevision = snapshot.histogramRevision;
  }
  if (snapshot.lastScram) {
    const eventKey = `${snapshot.lastScram.step}:${snapshot.lastScram.reason}`;
    if (eventKey !== lastEventKey) {
      lastEventKey = eventKey;
      post({
        ...version(),
        type: "event",
        event: {
          kind: "scram",
          ...snapshot.lastScram,
          controlRodEnd: snapshot.controlRodEnd,
          controlRodPercent: snapshot.controlRodPercent,
          protectionState: "tripped",
        },
      });
    }
  }
  if (type === "ready") {
    if (!activeMetadata) throw new Error("worker-metadata-missing");
    post({
      ...version(),
      type,
      running,
      speed,
      metadata: activeMetadata,
      snapshot,
    });
  } else {
    post({ ...version(), type, running, speed, snapshot });
  }
  // A complete model step is never shortened. At high load only the rate at
  // which another atomic step and a render publication may begin is reduced.
  publicationIntervalMs = Math.max(
    requestedPublicationIntervalMs,
    snapshot.neutronCount >= HIGH_LOAD_NEUTRON_THRESHOLD
      ? HIGH_LOAD_YIELD_MS
      : 0,
  );
  schedulerMinimumDelayMs =
    snapshot.neutronCount >= HIGH_LOAD_NEUTRON_THRESHOLD
      ? HIGH_LOAD_YIELD_MS
      : 0;
  lastPublication = now;
}

function commandResult(
  commandId: number,
  accepted: boolean,
  reason?: string,
): void {
  post({ ...version(), type: "command-result", commandId, accepted, reason });
}

function period(): number {
  const value = runPeriods.get(speed);
  if (value === undefined) throw new Error(`unsupported-run-mode:${speed}`);
  return Math.max(value, schedulerMinimumDelayMs);
}

function cancelTimer(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

function schedule(): void {
  cancelTimer();
  if (!running || !host) return;
  timer = setTimeout(tick, period());
}

function tick(): void {
  if (!running || !host) return;
  const results = host.step();
  for (const applied of results) {
    commandResult(
      applied.commandId,
      applied.result.accepted,
      applied.result.reason,
    );
  }
  if (performance.now() - lastPublication >= publicationIntervalMs) publish();
  schedule();
}

workerScope.onmessage = ({ data }: MessageEvent<UiToWorkerMessage>) => {
  try {
    if (data.protocolVersion !== PROTOCOL_VERSION) {
      throw new Error("protocol-version-mismatch");
    }
    if (data.type === "initialize") {
      host?.dispose();
      const model = createModel(data.modelId, data.seed);
      activeVersion = {
        modelId: "original-1.2",
        modelVersion: model.metadata.modelVersion,
        snapshotSchemaVersion: model.metadata.snapshotSchemaVersion,
      };
      activeMetadata = model.metadata;
      runPeriods = new Map(
        model.metadata.runModes.map((mode) => [mode.id, mode.periodMs]),
      );
      if (!runPeriods.has("normal") || !runPeriods.has("slow")) {
        throw new Error("required-run-mode-missing");
      }
      host = new ModelHost(
        model,
        isPriorityOriginal12Command,
      );
      host.initialize(data.config, data.seed);
      if (
        import.meta.env.DEV &&
        data.diagnosticNeutronCount !== undefined
      ) {
        model.fillTestNeutrons(data.diagnosticNeutronCount);
      }
      if (import.meta.env.DEV && data.diagnosticScenario) {
        model.applyCommand({ type: "withdraw-safety-rods" });
        if (data.diagnosticScenario.includes("detector-low")) {
          model.applyCommand({ type: "change-range", direction: "higher" });
          model.fillTestNeutrons(
            data.diagnosticScenario.endsWith("boundary") ? 30 : 29,
          );
        } else if (data.diagnosticScenario.includes("detector-high")) {
          model.fillTestNeutrons(
            data.diagnosticScenario.endsWith("boundary") ? 90 : 91,
          );
        } else if (data.diagnosticScenario.includes("power")) {
          model.applyCommand({ type: "change-range", direction: "higher" });
          model.applyCommand({ type: "change-range", direction: "higher" });
          model.fillTestNeutrons(1_200, {
            x: 80,
            y: 64,
            dx: 0,
            dy: 0,
            fast: false,
          });
          model.setTestPower(
            data.diagnosticScenario.endsWith("boundary") ? 120 : 120.001,
          );
        } else {
          model.setTestBurnout(80, 64, 5);
          model.applyCommand({ type: "set-burnout", enabled: true });
        }
      }
      lastGridRevision = -1;
      lastHistogramRevision = -1;
      lastEventKey = "";
      running = data.autoStart;
      publish("ready");
      schedule();
      return;
    }
    if (!host) throw new Error("worker-not-initialized");

    if (data.type === "model-command") {
      if (running) {
        host.enqueue(data.commandId, data.command);
        if (isPriorityOriginal12Command(data.command)) {
          cancelTimer();
          timer = setTimeout(tick, 0);
        }
      } else {
        const applied = host.applyImmediately(data.commandId, data.command);
        commandResult(
          applied.commandId,
          applied.result.accepted,
          applied.result.reason,
        );
        publish();
      }
      return;
    }

    const { command, commandId } = data;
    if (command.type === "start") {
      running = true;
      commandResult(commandId, true);
      schedule();
    } else if (command.type === "pause") {
      running = false;
      cancelTimer();
      for (const applied of host.applyQueued()) {
        commandResult(
          applied.commandId,
          applied.result.accepted,
          applied.result.reason,
        );
      }
      commandResult(commandId, true);
      publish();
    } else if (command.type === "step-once") {
      if (running) {
        commandResult(commandId, false, "pause-required");
      } else {
        for (const applied of host.step()) {
          commandResult(
            applied.commandId,
            applied.result.accepted,
            applied.result.reason,
          );
        }
        commandResult(commandId, true);
        publish();
      }
    } else if (command.type === "reset") {
      host.reset(command.config, command.seed);
      lastGridRevision = -1;
      lastHistogramRevision = -1;
      lastEventKey = "";
      speed = "normal";
      running = true;
      commandResult(commandId, true);
      publish();
      schedule();
    } else if (command.type === "set-speed") {
      if (!runPeriods.has(command.speed)) {
        commandResult(commandId, false, "unsupported-run-mode");
        return;
      }
      speed = command.speed;
      commandResult(commandId, true);
      publish();
      schedule();
    } else if (command.type === "request-snapshot") {
      commandResult(commandId, true);
      publish("model-state", true);
    } else {
      if (
        !Number.isFinite(command.maximumHz) ||
        command.maximumHz < 1 ||
        command.maximumHz > 30
      ) {
        commandResult(commandId, false, "invalid-publication-rate");
        return;
      }
      requestedPublicationIntervalMs = 1_000 / command.maximumHz;
      commandResult(commandId, true);
    }
  } catch (error) {
    running = false;
    cancelTimer();
    post({
      ...(activeVersion
        ? version()
        : {
            protocolVersion: PROTOCOL_VERSION,
            modelId: "original-1.2" as const,
            modelVersion: "unknown",
            snapshotSchemaVersion: 0,
          }),
      type: "fatal-error",
      code: "worker-failure",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
};
