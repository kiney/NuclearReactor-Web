import { expect, test, type Page } from "@playwright/test";

async function openPaused(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("nuclear-reactor-language", "de");
    Object.defineProperty(Crypto.prototype, "getRandomValues", {
      configurable: true,
      value<T extends ArrayBufferView | null>(array: T): T {
        if (array && "length" in array) {
          const values = array as unknown as { length: number; [index: number]: number };
          for (let index = 0; index < values.length; index += 1) values[index] = 1;
        }
        return array;
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("img", { name: /Reaktorraster/ })).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Fortsetzen", exact: true }),
  ).toBeVisible();
}

const stableScreenshot = {
  fullPage: true,
  stylePath: new URL("./visual-mask.css", import.meta.url).pathname,
} as const;

test("visuell: Initialzustand Desktop", async ({ page }) => {
  await openPaused(page);
  await expect(page).toHaveScreenshot("initial-desktop.png", {
    ...stableScreenshot,
  });
});

test("visuell: teilweise ausgefahrene Steuerstäbe", async ({ page }) => {
  await openPaused(page);
  await page
    .getByRole("button", { name: "Sicherheitsstäbe ausfahren" })
    .click();
  const withdraw = page.getByRole("button", { name: /Ausfahren/ }).last();
  for (let index = 0; index < 8; index += 1) await withdraw.click();
  await expect(page).toHaveScreenshot("control-rods-partial.png", {
    ...stableScreenshot,
  });
});

test("visuell: SCRAM-Alarm", async ({ page }) => {
  await openPaused(page);
  await page.getByRole("button", { name: "SCRAM", exact: true }).last().click();
  await expect(page.getByText(/SCRAM ausgelöst/)).toBeVisible();
  await expect(page).toHaveScreenshot("scram-alarm.png", {
    ...stableScreenshot,
  });
});

test("visuell: Reflektor und Abbrand", async ({ page }) => {
  await openPaused(page);
  await page.getByLabel("Moderierender Reflektor").click();
  await expect(page.getByLabel("Moderierender Reflektor")).toBeChecked();
  await page.getByLabel("Abbrand").click();
  await expect(page.getByLabel("Abbrand")).toBeChecked();
  await expect(page).toHaveScreenshot("reflector-burnout.png", {
    ...stableScreenshot,
  });
});

test("visuell: zwei abgeschlossene Diagrammfenster", async ({ page }) => {
  await openPaused(page);
  await page.getByRole("button", { name: "Fortsetzen", exact: true }).click();
  await expect
    .poll(async () => {
      const text = (await page.locator(".status-dot").textContent()) ?? "";
      return Number(
        text.match(/Schritt ([\d.]+)/)?.[1]?.replaceAll(".", "") ?? 0,
      );
    }, { timeout: 15_000 })
    .toBeGreaterThanOrEqual(205);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator(".histogram-panel").first()).toHaveAttribute(
    "data-has-previous",
    "true",
  );
  await expect(page).toHaveScreenshot("completed-histograms.png", {
    ...stableScreenshot,
  });
});

test("visuell: schmales Layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPaused(page);
  await expect(page).toHaveScreenshot("mobile.png", {
    ...stableScreenshot,
    maxDiffPixels: 500,
  });
});
