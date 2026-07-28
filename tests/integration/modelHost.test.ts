import { describe, expect, it } from "vitest";
import type {
  CommandResult,
  ModelMetadata,
  SimulationModel,
} from "../../src/simulation/contract/model";
import { ModelHost } from "../../src/runtime/modelHost";

interface TinyConfig {
  readonly offset: number;
}

class TinyModel implements SimulationModel<string, number, TinyConfig> {
  readonly metadata: ModelMetadata = {
    id: "tiny-test",
    modelVersion: "1",
    snapshotSchemaVersion: 1,
    name: "Tiny",
    grid: { width: 3, height: 2 },
    runModes: [{ id: "other", periodMs: 7 }],
    capabilities: ["counter"],
    render: {
      cellStyles: [{ id: 42, color: [1, 2, 3] }],
      pointCategories: [{ id: "dot", color: "#fff" }],
    },
  };
  value = 0;

  initialize(config: TinyConfig, seed: number): void {
    this.value = config.offset + seed;
  }

  applyCommand(command: string): CommandResult {
    if (command === "reject") return { accepted: false, reason: "test" };
    this.value = this.value * 10 + Number(command);
    return { accepted: true };
  }

  step(): void {
    this.value += 1;
  }

  createSnapshot(): number {
    return this.value;
  }

  reset(config: TinyConfig, seed: number): void {
    this.value = config.offset + seed;
  }

  dispose(): void {}
}

describe("ModelHost", () => {
  it("initialisiert ein abweichendes Modell aus Konfiguration und Seed", () => {
    const host = new ModelHost(new TinyModel(), () => false);
    host.initialize({ offset: 40 }, 2);
    expect(host.snapshot()).toBe(42);
  });

  it("wendet normale Befehle FIFO an der Schrittgrenze an", () => {
    const host = new ModelHost(new TinyModel(), () => false);
    host.enqueue(1, "2");
    host.enqueue(2, "3");
    expect(host.snapshot()).toBe(0);
    expect(host.step().map((entry) => entry.commandId)).toEqual([1, 2]);
    expect(host.snapshot()).toBe(24);
  });

  it("wendet Prioritätsbefehle zuerst und Zustandsbefehle pausiert sofort an", () => {
    const host = new ModelHost(new TinyModel(), (command) => command === "9");
    host.enqueue(1, "2");
    host.enqueue(2, "9");
    host.step();
    expect(host.snapshot()).toBe(93);
    expect(host.applyImmediately(3, "4").result.accepted).toBe(true);
    expect(host.snapshot()).toBe(934);
  });

  it("setzt Queue und beliebige Modellgröße beim Reset zurück", () => {
    const host = new ModelHost(new TinyModel(), () => false);
    host.enqueue(1, "2");
    host.reset({ offset: 0 }, 7);
    host.step();
    expect(host.snapshot()).toBe(8);
  });

  it("wendet beim Pausieren wartende Befehle ohne Modellschritt an", () => {
    const host = new ModelHost(new TinyModel(), () => false);
    host.enqueue(1, "2");
    host.enqueue(2, "3");
    expect(host.applyQueued()).toHaveLength(2);
    expect(host.snapshot()).toBe(23);
  });
});
