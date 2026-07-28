import { Original12Model } from "./models/original12/model";

export function createModel(
  modelId: string,
  seed: number,
): Original12Model {
  if (modelId === "original-1.2") {
    return new Original12Model(seed);
  }
  throw new Error(`unknown-model:${modelId}`);
}
