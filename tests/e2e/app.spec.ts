import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function reactorPixel(page: Page, x: number, y: number): Promise<number[]> {
  return page.evaluate(
    ({ x, y }) => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        ".reactor-canvas canvas",
      );
      if (!canvas) throw new Error("reactor-canvas-missing");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("reactor-context-missing");
      const pixelX = Math.min(
        canvas.width - 1,
        Math.floor(((x + 0.5) / 525) * canvas.width),
      );
      const pixelY = Math.min(
        canvas.height - 1,
        Math.floor(((y + 0.5) / 525) * canvas.height),
      );
      return Array.from(context.getImageData(pixelX, pixelY, 1, 1).data);
    },
    { x, y },
  );
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => console.error("PAGE ERROR", error));
  page.on("console", (message) => {
    if (message.type() === "error") console.error("BROWSER", message.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem("nuclear-reactor-language", "de");
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "NuclearReactor Web" })).toBeVisible();
  await expect(page.getByText("Originalmodell 1.2", { exact: true })).toBeVisible();
});

test("lädt rein lokal und bietet Grundbedienung", async ({ page }, testInfo) => {
  await expect(page.getByRole("img", { name: /Reaktorraster/ })).toBeVisible();
  await expect(page.locator(".metric-pair strong").first()).toHaveText("10²");
  await page
    .getByRole("button", { name: "Pause", exact: true })
    .click({ force: true });
  await expect(page.getByRole("button", { name: "Einzelschritt" })).toBeEnabled();
  const before = await page.locator(".status-dot").textContent();
  await page.getByRole("button", { name: "Einzelschritt" }).click();
  await expect
    .poll(async () => page.locator(".status-dot").textContent())
    .not.toBe(before);
  await page.screenshot({
    path: testInfo.outputPath("desktop.png"),
    fullPage: true,
  });
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(page.getByRole("img", { name: /Reaktorraster/ })).toBeVisible();
  const externalResources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => {
        const url = new URL(name);
        return url.protocol !== "data:" && url.hostname !== "127.0.0.1";
      }),
  );
  expect(externalResources).toEqual([]);
});

test("verlinkt immer den Upstream, aber lokal kein Impressum", async ({ page }) => {
  await expect(page.getByRole("link", { name: "Upstream auf GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/kiney/NuclearReactor-Web",
  );
  await expect(page.getByRole("link", { name: "Impressum" })).toHaveCount(0);
});

test("Sicherheitsstäbe, Steuerstäbe und manueller SCRAM", async ({ page }) => {
  await page
    .getByRole("button", { name: "Pause", exact: true })
    .click({ force: true });
  await page
    .getByRole("button", { name: "Sicherheitsstäbe ausfahren" })
    .click();
  await expect(page.getByText("Sicherheitskreis scharf", { exact: true })).toBeVisible();
  const withdraw = page.getByRole("button", { name: /Ausfahren/ }).last();
  await expect(withdraw).toBeEnabled();
  await withdraw.click();
  await page.getByRole("button", { name: "SCRAM", exact: true }).last().click();
  await expect(page.getByText(/SCRAM ausgelöst: manuelle Auslösung/)).toBeVisible();
});

test("bewegt Steuerstäbe beim Halten begrenzt und stoppt beim Loslassen", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page
    .getByRole("button", { name: "Sicherheitsstäbe ausfahren" })
    .click();
  const withdraw = page.getByRole("button", { name: /Ausfahren/ }).last();
  const displayedPercent = page.locator(
    '[aria-labelledby="rods-title"] .section-heading strong',
  );
  const percent = async () =>
    Number(
      ((await displayedPercent.textContent()) ?? "0")
        .replace("%", "")
        .replace(",", ".")
        .trim(),
    );

  await withdraw.click();
  await expect.poll(percent).toBeGreaterThan(0);
  const afterClick = await percent();

  await withdraw.hover();
  await page.mouse.down();
  await page.waitForTimeout(850);
  await page.mouse.up();
  await expect.poll(percent).toBeGreaterThan(afterClick);
  const afterHold = await percent();
  expect(afterHold - afterClick).toBeLessThanOrEqual(8);

  await page.waitForTimeout(150);
  const afterPendingSnapshot = await percent();
  await page.waitForTimeout(450);
  expect(await percent()).toBe(afterPendingSnapshot);
});

test("Messbereich verriegelt Sicherheitsstäbe", async ({ page }) => {
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: /Bereich höher/ }).click();
  const safety = page.getByRole("button", {
    name: "Sicherheitsstäbe ausfahren",
  });
  await expect(safety).toBeDisabled();
  await expect(safety).toHaveAttribute("aria-describedby", "range-lock-help");
  await expect(page.getByText("Sicherheitsstäbe benötigen Messbereich 10².")).toBeVisible();
  await page.getByRole("button", { name: /Bereich niedriger/ }).click();
  await expect(safety).toBeEnabled();
});

test("Moderatorablass verlangt Bestätigung und Reset akzeptiert Seedformate", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Moderator ablassen" }).click();
  await expect(page.getByText(/nicht rückgängig/)).toBeVisible();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  const seed = page.getByLabel("Vorgegebener Seed");
  const unchangedSeed = await page.locator(".diagnostics dd").first().textContent();
  await seed.fill("4294967296");
  await page.getByRole("button", { name: "Reset", exact: true }).last().click();
  await expect(page.getByText(/Seed muss zwischen/)).toBeVisible();
  await expect(page.locator(".diagnostics dd").first()).toHaveText(
    unchangedSeed ?? "",
  );
  await seed.fill("123456789");
  await page.getByRole("button", { name: "Reset", exact: true }).last().click();
  const decimalConfirm = page.getByRole("button", {
    name: "Neustart bestätigen",
  });
  if (await decimalConfirm.isVisible()) await decimalConfirm.click();
  await expect(page.getByText("123456789", { exact: true })).toBeVisible();
  await seed.fill("0x1234abcd");
  await page.getByRole("button", { name: "Reset", exact: true }).last().click();
  const confirmReset = page.getByRole("button", {
    name: "Neustart bestätigen",
  });
  if (await confirmReset.isVisible()) await confirmReset.click();
  await expect(page.getByText("305441741", { exact: true })).toBeVisible();
});

test("übersetzt die Oberfläche und bleibt schmal bedienbar", async ({ page }) => {
  await page.getByLabel("Sprache").selectOption("en");
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(page.getByText("Horizontal density distribution")).toBeVisible();
  await page.setViewportSize({ width: 900, height: 900 });
  await expect(page.getByRole("button", { name: "SCRAM", exact: true }).last()).toBeVisible();
  await expect(page.getByText("Vertical density distribution")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset", exact: true }).last()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "SCRAM", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
});

test("Erklärmodus reagiert auf Hover, Tastatur und den aktuellen Zustand", async ({
  page,
}) => {
  const toggle = page.getByRole("button", {
    name: "Erklärmodus",
    exact: true,
  });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  const panel = page.getByRole("region", { name: "Interaktive Erklärung" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading")).toHaveText("Simulation erkunden");

  await page.locator(".instrument").first().hover();
  await expect(panel.getByRole("heading")).toHaveText("Neutronendetektor");
  await expect(panel).toContainText("Neutronenzahl");

  const safety = page.getByRole("button", {
    name: "Sicherheitsstäbe ausfahren",
  });
  await page.getByRole("button", { name: /Bereich höher/ }).click();
  await expect(safety).toBeDisabled();
  const safetyCard = page.locator(".controls").first();
  await safetyCard.focus();
  await expect(panel.getByRole("heading")).toHaveText("Sicherheitskreis");
  await expect(panel).toContainText(
    "Aktuell gesperrt: zuerst Messbereich 10² einstellen.",
  );

  await page.getByLabel("Sprache").selectOption("en");
  await safetyCard.focus();
  await expect(
    page.getByRole("region", { name: "Interactive explanation" }),
  ).toContainText("Currently locked: select the 10² range first.");

  await page.getByRole("button", { name: "Explanation mode" }).click();
  await expect(
    page.getByRole("region", { name: "Interactive explanation" }),
  ).toHaveCount(0);
});

test("schließt zwei Diagrammfenster ab und setzt nur Messungen zurück", async ({
  page,
}) => {
  await expect
    .poll(async () => {
      const text = (await page.locator(".status-dot").textContent()) ?? "";
      const digits = text.match(/Schritt ([\d.]+)/)?.[1]?.replaceAll(".", "");
      return Number(digits ?? 0);
    }, { timeout: 15_000 })
    .toBeGreaterThanOrEqual(205);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Fortsetzen", exact: true }),
  ).toBeVisible();
  const stepBefore = Number(
    ((await page.locator(".status-dot").textContent()) ?? "")
      .match(/Schritt ([\d.]+)/)?.[1]
      ?.replaceAll(".", "") ?? 0,
  );
  await expect(page.locator(".histogram-panel").first()).toHaveAttribute(
    "data-has-current",
    "true",
  );
  await expect(page.locator(".histogram-panel").first()).toHaveAttribute(
    "data-has-previous",
    "true",
  );
  await expect(page.locator(".histogram-panel .sr-only").first()).toContainText(
    "gemeinsames Maximum",
  );
  const fissionCurve = page
    .locator(".histogram-panel")
    .first()
    .getByRole("button", { name: "Spaltorte" });
  await expect(fissionCurve).toHaveAttribute("aria-pressed", "false");
  await fissionCurve.click();
  await expect(fissionCurve).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Messungen zurücksetzen" }).click();
  await expect(page.locator(".histogram-panel").first()).toHaveAttribute(
    "data-has-current",
    "false",
  );
  await expect
    .poll(async () =>
      Number(
        ((await page.locator(".status-dot").textContent()) ?? "")
          .match(/Schritt ([\d.]+)/)?.[1]
          ?.replaceAll(".", "") ?? 0,
      ),
    )
    .toBe(stepBefore);
});

test("hat in den Hauptzuständen keine schweren axe-Befunde", async ({ page }) => {
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const audit = async () => {
    const results = await new AxeBuilder({ page }).analyze();
    return results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    );
  };
  expect(await audit()).toEqual([]);
  await page.getByRole("button", { name: "Erklärmodus" }).click();
  await expect(
    page.getByRole("region", { name: "Interaktive Erklärung" }),
  ).toBeVisible();
  expect(await audit()).toEqual([]);
  await page.getByRole("button", { name: "Erklärmodus" }).click();
  await page
    .getByRole("button", { name: "Sicherheitsstäbe ausfahren" })
    .click();
  await page.getByRole("button", { name: "SCRAM", exact: true }).last().click();
  await expect(page.getByText(/SCRAM ausgelöst/)).toBeVisible();
  expect(await audit()).toEqual([]);
});

test("bedient Schutzfunktionen vollständig per Tastatur", async ({ page }) => {
  const pause = page.getByRole("button", { name: "Pause", exact: true });
  await pause.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Fortsetzen", exact: true }),
  ).toBeVisible();

  const higherRange = page.getByRole("button", { name: /Bereich höher/ });
  await higherRange.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Sicherheitsstäbe ausfahren" }),
  ).toHaveAttribute("aria-describedby", "range-lock-help");
  const lowerRange = page.getByRole("button", { name: /Bereich niedriger/ });
  await expect(lowerRange).toBeEnabled();
  await lowerRange.focus();
  await page.keyboard.press("Enter");

  const safety = page.getByRole("button", {
    name: "Sicherheitsstäbe ausfahren",
  });
  await expect(safety).toBeEnabled();
  await safety.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Sicherheitskreis scharf", { exact: true })).toBeVisible();

  const withdraw = page.getByRole("button", { name: /Ausfahren/ }).last();
  await withdraw.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/2,5 %|1,3 %/)).toBeVisible();

  const scram = page.getByRole("button", { name: "SCRAM", exact: true }).last();
  await scram.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/SCRAM ausgelöst/)).toBeVisible();
  await expect(scram).toBeFocused();
  await expect(page.locator(".alarm-banner")).toHaveAttribute(
    "aria-live",
    "polite",
  );
});

test("Zeitlupe ändert den Scheduler und Reset stellt Normalbetrieb her", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByLabel("Geschwindigkeit").selectOption("slow");
  await page.getByRole("button", { name: "Fortsetzen", exact: true }).click();
  const start = Number(
    ((await page.locator(".status-dot").textContent()) ?? "")
      .match(/Schritt ([\d.]+)/)?.[1]
      ?.replaceAll(".", "") ?? 0,
  );
  await page.waitForTimeout(450);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Fortsetzen", exact: true }),
  ).toBeVisible();
  const end = Number(
    ((await page.locator(".status-dot").textContent()) ?? "")
      .match(/Schritt ([\d.]+)/)?.[1]
      ?.replaceAll(".", "") ?? 0,
  );
  expect(end - start).toBeGreaterThanOrEqual(2);
  expect(end - start).toBeLessThanOrEqual(7);

  await page.getByRole("button", { name: "Gleicher Seed" }).click();
  const confirm = page.getByRole("button", { name: "Neustart bestätigen" });
  if (await confirm.isVisible()) await confirm.click();
  await expect(page.getByLabel("Geschwindigkeit")).toHaveValue("normal");
});

test("SCRAM reagiert auch im laufenden Worker unmittelbar", async ({ page }) => {
  const reaction = await page.evaluate(async () => {
    const buttons = [...document.querySelectorAll<HTMLButtonElement>("button")];
    const scram = buttons.filter((button) => button.textContent?.trim() === "SCRAM").at(-1);
    if (!scram) throw new Error("scram-control-missing");
    const started = performance.now();
    scram.click();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return {
      elapsed: performance.now() - started,
      alarm: document.querySelector(".alarm-banner")?.textContent ?? "",
    };
  });
  expect(reaction.alarm).toMatch(/SCRAM (angefordert|ausgelöst)/);
  expect(reaction.elapsed).toBeLessThan(100);
  await expect(page.getByText(/SCRAM ausgelöst/)).toBeVisible({
    timeout: 5_000,
  });
});

test("bleibt mit 100.000 aktiven Neutronen während eines Schritts bedienbar", async ({
  page,
}) => {
  await page.goto("/?diagnosticNeutrons=100000");
  await expect(page.getByText("100.000", { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByRole("button", { name: "Fortsetzen", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Fortsetzen", exact: true }).click();
  await page.waitForTimeout(300);
  const languageReaction = await page.evaluate(async () => {
    const language = document.querySelectorAll<HTMLSelectElement>("select")[1];
    if (!language) throw new Error("language-control-missing");
    const started = performance.now();
    language.value = "en";
    language.dispatchEvent(new Event("change", { bubbles: true }));
    while (performance.now() - started < 1_000) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (document.querySelector(".eyebrow")?.textContent === "Original model 1.2") {
        return performance.now() - started;
      }
    }
    return performance.now() - started;
  });
  expect(languageReaction).toBeLessThan(1_000);
  await expect(page.getByText("Original model 1.2", { exact: true })).toBeVisible();

  await page.evaluate(() => {
    const pause = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent?.trim() === "Pause",
    );
    if (!pause) throw new Error("pause-control-missing");
    pause.click();
  });
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible({ timeout: 5_000 });
});

test("zeigt alle automatischen SCRAM-Ursachen in Deutsch und Englisch", async ({
  page,
}) => {
  const cases = [
    ["detector-high", "Detektor über 90 %", "detector above 90%"],
    [
      "detector-low",
      "Detektor unter 3 % im hohen Messbereich",
      "detector below 3% in a high range",
    ],
    ["power-high", "Leistungsindikator über 120", "power indicator above 120"],
  ] as const;

  for (const [scenario, german, english] of cases) {
    await page.evaluate(() =>
      localStorage.setItem("nuclear-reactor-language", "de"),
    );
    await page.goto(`/?diagnosticScenario=${scenario}`);
    await expect(
      page.getByRole("button", { name: "Einzelschritt" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Einzelschritt" }).click();
    await expect(page.locator(".alarm-banner")).toContainText(german);
    await page.getByLabel("Sprache").selectOption("en");
    await expect(page.locator(".alarm-banner")).toContainText(english);
  }
});

test("löst an den exakten Schutzgrenzen 90, 3 und 120 nicht aus", async ({
  page,
}) => {
  for (const scenario of [
    "detector-high-boundary",
    "detector-low-boundary",
    "power-boundary",
  ]) {
    await page.evaluate(() =>
      localStorage.setItem("nuclear-reactor-language", "de"),
    );
    await page.goto(`/?diagnosticScenario=${scenario}`);
    await page.getByRole("button", { name: "Einzelschritt" }).click();
    await expect(
      page.getByText("Sicherheitskreis scharf", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/SCRAM ausgelöst/)).toHaveCount(0);
  }
});

test("bildet Reflektor, Moderatorablass und Geometrie-Reset sichtbar ab", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const reflector = page.getByLabel("Moderierender Reflektor");
  await reflector.click();
  await expect(reflector).toBeChecked();
  await expect.poll(() => reactorPixel(page, 10, 10)).toEqual([242, 201, 76, 255]);

  await page.getByRole("button", { name: "Moderator ablassen" }).click();
  await page.getByRole("button", { name: "Ablassen bestätigen" }).click();
  await expect(reflector).not.toBeChecked();
  await expect.poll(() => reactorPixel(page, 10, 10)).toEqual([248, 250, 252, 255]);
  await expect.poll(() => reactorPixel(page, 64, 64)).toEqual([248, 250, 252, 255]);

  await page.getByRole("button", { name: "Gleicher Seed" }).click();
  const confirmReset = page.getByRole("button", {
    name: "Neustart bestätigen",
  });
  if (await confirmReset.isVisible()) await confirmReset.click();
  await expect(
    page.getByRole("button", { name: "Moderator ablassen" }),
  ).toBeVisible();
  await expect.poll(() => reactorPixel(page, 64, 64)).toEqual([242, 201, 76, 255]);
});

test("zeigt erhaltenen Abbrand nur bei aktivierter Option", async ({ page }) => {
  await page.goto("/?diagnosticScenario=burnout");
  const burnout = page.getByLabel("Abbrand");
  await expect(burnout).toBeChecked();
  await expect.poll(() => reactorPixel(page, 80, 64)).toEqual([29, 129, 73, 255]);

  await burnout.click();
  await expect.poll(() => reactorPixel(page, 80, 64)).toEqual([46, 173, 98, 255]);
  await burnout.click();
  await expect.poll(() => reactorPixel(page, 80, 64)).toEqual([29, 129, 73, 255]);
});
