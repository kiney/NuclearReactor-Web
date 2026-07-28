import { useSyncExternalStore } from "react";
import type { WorkerClient } from "./workerClient";

export function useSimulationSnapshot(client: WorkerClient) {
  return useSyncExternalStore(
    client.subscribe,
    client.getSnapshot,
    client.getSnapshot,
  );
}
