import { describe, expect, it } from "vitest";
import { createModel } from "../../src/simulation/modelFactory";
import { DEFAULT_ORIGINAL12_CONFIG } from "../../src/simulation/models/original12/constants";

describe("modelFactory", () => {
  it("ordnet original-1.2 explizit dem versionierten Modell zu", () => {
    const model = createModel("original-1.2", 1);
    expect(model.metadata.id).toBe("original-1.2");
    expect(model.metadata.modelVersion).toBe("1.0.0");
    expect(model.metadata.grid).toEqual({ width: 525, height: 525 });
    expect(model.metadata.runModes).toEqual([
      { id: "normal", periodMs: 20 },
      { id: "slow", periodMs: 100 },
    ]);
    expect(model.metadata.capabilities).toContain("scram");
    expect(model.metadata.render.cellStyles).toHaveLength(5);
    expect(model.metadata.render.pointCategories.map(({ id }) => id)).toEqual([
      "fast",
      "slow",
    ]);
    model.initialize(DEFAULT_ORIGINAL12_CONFIG, 1);
    expect(model.createSnapshot().configuration).toEqual(
      DEFAULT_ORIGINAL12_CONFIG,
    );
  });

  it("lehnt unbekannte Kennungen ab und lädt keinen fremden Code", () => {
    expect(() => createModel("remote:model", 1)).toThrow(
      "unknown-model:remote:model",
    );
  });
});
