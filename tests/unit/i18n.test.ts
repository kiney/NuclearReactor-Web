import { describe, expect, it } from "vitest";
import { translations } from "../../src/i18n/translations";

describe("Internationalisierung", () => {
  it("enthält für jeden deutschen Schlüssel einen nichtleeren englischen Text", () => {
    expect(Object.keys(translations.en)).toEqual(Object.keys(translations.de));
    for (const key of Object.keys(translations.de) as Array<
      keyof typeof translations.de
    >) {
      expect(translations.de[key].trim()).not.toBe("");
      expect(translations.en[key].trim()).not.toBe("");
    }
  });

  it("übersetzt sämtliche fachlichen SCRAM-Ursachen", () => {
    for (const key of [
      "reasonManual",
      "reasonDetectorHigh",
      "reasonDetectorLow",
      "reasonPowerHigh",
    ] as const) {
      expect(translations.de[key]).not.toBe(translations.en[key]);
    }
  });

  it("deckt Hilfe, Herkunft, Materialien, Abbrand und Schutzgrenzen ab", () => {
    for (const language of ["de", "en"] as const) {
      const help = `${translations[language].helpText} ${translations[language].physicsHelp}`;
      expect(help).toContain("H.-M. Prasser");
      expect(help).toContain("www.ktg-sachsen.de");
      expect(help).toMatch(/Abbrand|burnup/i);
      expect(help).toMatch(/Quelle|source/i);
      expect(help).toMatch(/Reflektor|reflector/i);
      expect(help).toContain("120");
    }
  });
});
