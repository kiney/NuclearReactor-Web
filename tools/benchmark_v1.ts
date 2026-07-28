import { Original12Model } from "../src/simulation/models/original12/model";
import { SequenceRandom } from "../src/simulation/models/original12/rng";

for (const count of [1_000, 10_000, 100_000]) {
  const times: number[] = [];
  for (let run = 0; run < 7; run += 1) {
    const model = new Original12Model(1, new SequenceRandom([]));
    model.fillTestNeutrons(count);
    const started = performance.now();
    model.step();
    times.push(performance.now() - started);
  }
  times.sort((left, right) => left - right);
  console.log(
    JSON.stringify({
      count,
      medianMs: Number(times[3].toFixed(3)),
      minimumMs: Number(times[0].toFixed(3)),
      maximumMs: Number(times[6].toFixed(3)),
    }),
  );
}
