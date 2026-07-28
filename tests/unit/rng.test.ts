import { describe, expect, it } from "vitest";
import { DelphiLcg } from "../../src/simulation/models/original12/rng";

describe("DelphiLcg", () => {
  it("liefert ab Seed 1 die fünf Referenzzustände", () => {
    const rng = new DelphiLcg(1);
    const states = [0x08088406, 0xdc6dac1f, 0x33dc589c, 0x45de2b0d, 0xabf18b42];
    for (const expected of states) {
      const value = rng.next();
      expect(rng.state).toBe(expected);
      expect(value).toBe(expected / 0x1_0000_0000);
    }
  });

  it("bleibt unsigned 32 Bit und im halboffenen Einheitsintervall", () => {
    const rng = new DelphiLcg(0xffffffff);
    for (let index = 0; index < 10_000; index += 1) {
      const value = rng.next();
      expect(rng.state).toBeGreaterThanOrEqual(0);
      expect(rng.state).toBeLessThanOrEqual(0xffffffff);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("setzt Zustand und Folge zurück", () => {
    const rng = new DelphiLcg(42);
    const expected = [rng.next(), rng.next(), rng.next()];
    rng.reset(42);
    expect([rng.next(), rng.next(), rng.next()]).toEqual(expected);
  });
});
