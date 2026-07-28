import { describe, expect, it } from "vitest";
import {
  CONTROL_ROD_STARTS,
  CORE_SIZE,
  GRID_CELLS,
  MATERIAL,
  SAFETY_ROD_STARTS,
} from "../../src/simulation/models/original12/constants";
import {
  countCoreMaterials,
  createInitialMaterial,
  rebuildMaterial,
} from "../../src/simulation/models/original12/geometry";

const baseState = {
  controlRodEnd: 461,
  safetyRodsWithdrawn: false,
  replacementMaterial: MATERIAL.MODERATOR,
  reflectorEnabled: false,
  sourceEnabled: false,
} as const;

describe("Originalgeometrie", () => {
  it("besitzt das exakte Raster und die Materialanteile", () => {
    const material = createInitialMaterial();
    expect(material).toHaveLength(GRID_CELLS);
    expect(countCoreMaterials(material)).toEqual({
      moderator: 153 * CORE_SIZE,
      fuel: 192 * CORE_SIZE,
      absorber: 52 * CORE_SIZE,
    });
  });

  it("verwendet die rekonstruierten Stabpositionen", () => {
    expect(SAFETY_ROD_STARTS).toEqual([
      70, 134, 198, 262, 326, 390, 454,
    ]);
    expect(CONTROL_ROD_STARTS).toEqual([102, 166, 230, 294, 358, 422]);
  });

  it("zieht Sicherheits- und Steuerstäbe gruppenweise aus", () => {
    const material = createInitialMaterial();
    rebuildMaterial(material, {
      ...baseState,
      safetyRodsWithdrawn: true,
    });
    expect(countCoreMaterials(material)).toEqual({
      moderator: 181 * CORE_SIZE,
      fuel: 192 * CORE_SIZE,
      absorber: 24 * CORE_SIZE,
    });

    rebuildMaterial(material, {
      ...baseState,
      safetyRodsWithdrawn: true,
      controlRodEnd: 64,
    });
    expect(countCoreMaterials(material)).toEqual({
      moderator: 205 * CORE_SIZE,
      fuel: 192 * CORE_SIZE,
      absorber: 0,
    });
  });

  it("belegt bei Teilstellung exakt 24 × (Stabende - 64) Zellen", () => {
    const material = createInitialMaterial();
    const controlRodEnd = 211;
    rebuildMaterial(material, {
      ...baseState,
      safetyRodsWithdrawn: true,
      controlRodEnd,
    });
    expect(countCoreMaterials(material).absorber).toBe(
      24 * (controlRodEnd - 64),
    );
  });

  it("ändert mit dem Reflektor nur den Außenrand", () => {
    const before = createInitialMaterial();
    const after = before.slice();
    rebuildMaterial(after, { ...baseState, reflectorEnabled: true });
    for (let y = 0; y < 525; y += 1) {
      for (let x = 0; x < 525; x += 1) {
        const index = y * 525 + x;
        const outside = x < 64 || x > 460 || y < 64 || y > 460;
        expect(after[index]).toBe(outside ? MATERIAL.MODERATOR : before[index]);
      }
    }
  });

  it("zeichnet die Quelle konsistent als 8 × 8 Zellen", () => {
    const material = createInitialMaterial();
    rebuildMaterial(material, { ...baseState, sourceEnabled: true });
    expect(
      material.reduce(
        (count, value) => count + Number(value === MATERIAL.SOURCE),
        0,
      ),
    ).toBe(64);
  });

  it("entfernt nach Moderatorablass den gesamten Moderator", () => {
    const material = createInitialMaterial();
    rebuildMaterial(material, {
      ...baseState,
      replacementMaterial: MATERIAL.EMPTY,
    });
    expect(material).not.toContain(MATERIAL.MODERATOR);
  });
});
