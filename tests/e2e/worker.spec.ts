import { expect, test } from "@playwright/test";

test("Worker erfüllt Initialisierung, Laufbefehle, Vollsnapshot und Reset", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const worker = new Worker("/src/runtime/simulationWorker.ts", {
      type: "module",
    });
    const messages: Array<Record<string, any>> = [];
    const waitFor = (
      predicate: (message: Record<string, any>) => boolean,
      timeoutMs = 5_000,
    ) =>
      new Promise<Record<string, any>>((resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error("worker-message-timeout")),
          timeoutMs,
        );
        const listener = ({ data }: MessageEvent<Record<string, any>>) => {
          messages.push(data);
          if (predicate(data)) {
            window.clearTimeout(timeout);
            worker.removeEventListener("message", listener);
            resolve(data);
          }
        };
        worker.addEventListener("message", listener);
      });
    const post = (message: Record<string, unknown>) =>
      worker.postMessage({ protocolVersion: 1, ...message });
    const config = { profile: "original-1.2-default" };

    const readyPromise = waitFor((message) => message.type === "ready");
    post({
      type: "initialize",
      modelId: "original-1.2",
      config,
      seed: 0x12345678,
      autoStart: false,
    });
    const ready = await readyPromise;
    const initial = {
      rngState: ready.snapshot.rngState,
      neutronX: Array.from(ready.snapshot.neutronX as Float32Array),
      neutronY: Array.from(ready.snapshot.neutronY as Float32Array),
      neutronFast: Array.from(ready.snapshot.neutronFast as Uint8Array),
      material: Array.from(
        (ready.snapshot.material as Uint8Array).slice(0, 1_000),
      ),
    };

    const ratePromise = waitFor(
      (message) =>
        message.type === "command-result" && message.commandId === 1,
    );
    post({
      type: "runtime-command",
      commandId: 1,
      command: { type: "set-publication-rate", maximumHz: 10 },
    });
    await ratePromise;

    const sourceStatePromise = waitFor(
      (message) =>
        message.type === "model-state" && message.snapshot.sourceEnabled,
    );
    post({
      type: "model-command",
      commandId: 2,
      command: { type: "set-source", enabled: true },
    });
    const sourceState = await sourceStatePromise;

    const stepPromise = waitFor(
      (message) =>
        message.type === "model-state" && message.snapshot.step === 1,
    );
    post({
      type: "runtime-command",
      commandId: 3,
      command: { type: "step-once" },
    });
    const stepped = await stepPromise;
    const comparableSnapshot = (message: Record<string, any>) => ({
      rngState: message.snapshot.rngState,
      step: message.snapshot.step,
      neutronCount: message.snapshot.neutronCount,
      neutronX: Array.from(message.snapshot.neutronX as Float32Array),
      neutronY: Array.from(message.snapshot.neutronY as Float32Array),
      neutronFast: Array.from(message.snapshot.neutronFast as Uint8Array),
      detectorPercent: message.snapshot.detectorPercent,
      power: message.snapshot.power,
      fissionsThisStep: message.snapshot.fissionsThisStep,
      fissionsTotal: message.snapshot.fissionsTotal,
      sourceEnabled: message.snapshot.sourceEnabled,
      histogramProgress: message.snapshot.horizontalHistogram.progress,
    });
    const firstSequence = comparableSnapshot(stepped);

    const fullPromise = waitFor(
      (message) =>
        message.type === "model-state" &&
        message.snapshot.step === 1 &&
        message.snapshot.material.length === 525 * 525,
    );
    post({
      type: "runtime-command",
      commandId: 4,
      command: { type: "request-snapshot" },
    });
    const full = await fullPromise;

    const resetPromise = waitFor(
      (message) =>
        message.type === "model-state" &&
        message.snapshot.step === 0 &&
        !message.snapshot.sourceEnabled,
    );
    post({
      type: "runtime-command",
      commandId: 5,
      command: { type: "reset", config, seed: 0x12345678 },
    });
    const pausedResetPromise = waitFor(
      (message) =>
        message.type === "model-state" &&
        message.snapshot.step === 0 &&
        message.running === false,
    );
    post({
      type: "runtime-command",
      commandId: 6,
      command: { type: "pause" },
    });
    const reset = await resetPromise;

    await pausedResetPromise;
    const replaySourcePromise = waitFor(
      (message) =>
        message.type === "model-state" &&
        message.snapshot.sourceEnabled &&
        message.snapshot.step === 0,
    );
    post({
      type: "model-command",
      commandId: 7,
      command: { type: "set-source", enabled: true },
    });
    await replaySourcePromise;
    const replayStepPromise = waitFor(
      (message) =>
        message.type === "model-state" && message.snapshot.step === 1,
    );
    post({
      type: "runtime-command",
      commandId: 8,
      command: { type: "step-once" },
    });
    const replay = await replayStepPromise;
    worker.terminate();

    return {
      readyMaterialLength: ready.snapshot.material.length,
      readyCapabilities: ready.metadata.capabilities,
      sourceMaterialLength: sourceState.snapshot.material.length,
      steppedStep: stepped.snapshot.step,
      steppedMaterialLength: stepped.snapshot.material.length,
      fullMaterialLength: full.snapshot.material.length,
      reset: {
        rngState: reset.snapshot.rngState,
        neutronX: Array.from(reset.snapshot.neutronX as Float32Array),
        neutronY: Array.from(reset.snapshot.neutronY as Float32Array),
        neutronFast: Array.from(reset.snapshot.neutronFast as Uint8Array),
        material: Array.from(
          (reset.snapshot.material as Uint8Array).slice(0, 1_000),
        ),
      },
      initial,
      firstSequence,
      replaySequence: comparableSnapshot(replay),
      versionsValid: messages.every(
        (message) =>
          message.protocolVersion === 1 &&
          message.modelId === "original-1.2" &&
          message.modelVersion === "1.0.0" &&
          message.snapshotSchemaVersion === 1,
      ),
    };
  });

  expect(result.readyMaterialLength).toBe(525 * 525);
  expect(result.readyCapabilities).toContain("scram");
  expect(result.sourceMaterialLength).toBe(525 * 525);
  expect(result.steppedStep).toBe(1);
  expect(result.steppedMaterialLength).toBe(0);
  expect(result.fullMaterialLength).toBe(525 * 525);
  expect(result.reset).toEqual(result.initial);
  expect(result.replaySequence).toEqual(result.firstSequence);
  expect(result.versionsValid).toBe(true);
});

test("Worker lehnt unbekannte Modelle ohne Fremdcode-Nachladen ab", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  const fatal = await page.evaluate(
    () =>
      new Promise<Record<string, any>>((resolve, reject) => {
        const worker = new Worker("/src/runtime/simulationWorker.ts", {
          type: "module",
        });
        const timeout = window.setTimeout(
          () => reject(new Error("worker-message-timeout")),
          5_000,
        );
        worker.onmessage = ({ data }) => {
          if (data.type === "fatal-error") {
            window.clearTimeout(timeout);
            worker.terminate();
            resolve(data);
          }
        };
        worker.postMessage({
          type: "initialize",
          protocolVersion: 1,
          modelId: "remote:model",
          config: { profile: "original-1.2-default" },
          seed: 1,
          autoStart: false,
        });
      }),
  );

  expect(fatal.code).toBe("worker-failure");
  expect(fatal.detail).toBe("unknown-model:remote:model");
  expect(
    requests.filter((url) => !url.startsWith("http://127.0.0.1:4173/")),
  ).toEqual([]);
});
