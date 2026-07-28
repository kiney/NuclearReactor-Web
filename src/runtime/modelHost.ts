import type {
  CommandResult,
  SimulationModel,
} from "../simulation/contract/model";

interface QueuedCommand<TCommand> {
  readonly commandId: number;
  readonly command: TCommand;
}

export interface AppliedCommand {
  readonly commandId: number;
  readonly result: CommandResult;
}

export class ModelHost<TCommand, TSnapshot, TConfig = unknown> {
  private queue: Array<QueuedCommand<TCommand>> = [];
  private priorityQueue: Array<QueuedCommand<TCommand>> = [];

  constructor(
    private readonly model: SimulationModel<TCommand, TSnapshot, TConfig>,
    private readonly isPriority: (command: TCommand) => boolean,
  ) {}

  initialize(config: TConfig, seed: number): void {
    this.queue = [];
    this.priorityQueue = [];
    this.model.initialize(config, seed);
  }

  enqueue(commandId: number, command: TCommand): void {
    const queue = this.isPriority(command) ? this.priorityQueue : this.queue;
    queue.push({ commandId, command });
  }

  applyImmediately(commandId: number, command: TCommand): AppliedCommand {
    return { commandId, result: this.model.applyCommand(command) };
  }

  applyQueued(): AppliedCommand[] {
    const queued = [...this.priorityQueue, ...this.queue];
    this.priorityQueue = [];
    this.queue = [];
    return queued.map(({ commandId, command }) => ({
      commandId,
      result: this.model.applyCommand(command),
    }));
  }

  step(): AppliedCommand[] {
    const results = this.applyQueued();
    this.model.step();
    return results;
  }

  reset(config: TConfig, seed: number): void {
    this.queue = [];
    this.priorityQueue = [];
    this.model.reset(config, seed);
  }

  snapshot(kind: "full" | "telemetry" = "full"): TSnapshot {
    return this.model.createSnapshot(kind);
  }

  dispose(): void {
    this.model.dispose();
  }
}
