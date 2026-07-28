import { describe, expect, it } from "vitest";
import { parseSeed } from "../../src/app/seed";

describe("Seed-Eingabe", () => {
  it("akzeptiert dezimale und hexadezimale 32-Bit-Werte", () => {
    expect(parseSeed("0")).toBe(0);
    expect(parseSeed("4294967295")).toBe(0xffffffff);
    expect(parseSeed("0x1234abcd")).toBe(0x1234abcd);
  });

  it("weist ungültige oder zu große Werte ab", () => {
    expect(parseSeed("")).toBeNull();
    expect(parseSeed("-1")).toBeNull();
    expect(parseSeed("4294967296")).toBeNull();
    expect(parseSeed("12.5")).toBeNull();
    expect(parseSeed("xyz")).toBeNull();
  });
});
