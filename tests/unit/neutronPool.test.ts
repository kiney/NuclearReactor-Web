import { describe, expect, it } from "vitest";
import { NeutronPool } from "../../src/simulation/models/original12/neutronPool";
import { SequenceRandom } from "../../src/simulation/models/original12/rng";

describe("NeutronPool", () => {
  it("erzeugt normierte Richtungen der Länge 5", () => {
    const pool = new NeutronPool();
    pool.addRandomDirection(1, 2, true, new SequenceRandom([1, 0]));
    expect(Math.hypot(pool.dx[0], pool.dy[0])).toBeCloseTo(5, 6);
  });

  it("komprimiert aktiv stabile nach vorn", () => {
    const pool = new NeutronPool();
    pool.add(1, 1, 0, 0, true);
    pool.add(2, 2, 0, 0, false);
    pool.add(3, 3, 0, 0, true);
    pool.active[1] = 0;
    pool.compact();
    expect(pool.count).toBe(2);
    expect(Array.from(pool.x.slice(0, 2))).toEqual([1, 3]);
    expect(Array.from(pool.fast.slice(0, 2))).toEqual([1, 1]);
  });
});
