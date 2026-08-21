import { expect, test } from "@playwright/test";
import { createCareer } from "@theclutch/engine";
import { dismissDevChrome, gotoFresh, playUntil } from "./helpers";

const DATE = "2026-08-21";
const CODE = "BK1-D-260821";

test.describe("Daily y Challenge", () => {
  test("la landing enseña el Daily del día, sin potencial", async ({ page }) => {
    await gotoFresh(page, "/");
    await dismissDevChrome(page);
    await expect(page.getByRole("heading", { name: "THE CLUTCH" })).toBeVisible();
    await expect(page.getByTestId("daily-date")).toBeVisible();
    await expect(page.getByTestId("daily-name")).toBeVisible();
    await expect(page.getByTestId("daily-code")).toHaveText(/^BK1-D-\d{6}$/);
    await expect(page.getByRole("button", { name: "Copiar código" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Jugar el Daily" })).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/potencial\s+\d/i);
    await expect(page.getByLabel("Challenge")).toBeVisible();
  });

  test("la misma fecha asigna el mismo jugador y no hay Otra carta", async ({ page }) => {
    await gotoFresh(page, `/play?mode=daily&date=${DATE}&run=e2e-daily-a`);
    await dismissDevChrome(page);
    await expect(page.getByTestId("career-card")).toBeVisible();
    await expect(page.getByTestId("run-banner")).toContainText("Intento del día");
    await expect(page.getByRole("button", { name: "Otra carta" })).toHaveCount(0);
    const name = await page.getByTestId("player-name").innerText();
    expect(name.length).toBeGreaterThan(2);

    await gotoFresh(page, `/play?mode=daily&date=${DATE}&run=e2e-daily-b&pos=C`);
    await dismissDevChrome(page);
    await expect(page.getByTestId("player-name")).toHaveText(name);
    await expect(page.getByRole("button", { name: "Otra carta" })).toHaveCount(0);
    await expect(page.getByTestId("decision-card")).toContainText("¿Dónde empiezas?");

    const steps = await playUntil(page, "season-recap", 30);
    expect(steps).toBeLessThan(30);
    await expect(page.getByTestId("season-recap")).toContainText("Temporada 1");
  });

  test("un código Challenge carga el mismo jugador", async ({ page }) => {
    await gotoFresh(page, `/play?mode=daily&date=${DATE}&run=e2e-ch-src`);
    await dismissDevChrome(page);
    const name = await page.getByTestId("player-name").innerText();

    await gotoFresh(page, "/");
    await dismissDevChrome(page);
    await page.getByLabel("Challenge").fill(CODE);
    await page.getByRole("button", { name: "Jugar código" }).click();
    await expect(page).toHaveURL(/mode=challenge/);
    await expect(page.getByTestId("player-name")).toHaveText(name);
    await expect(page.getByTestId("run-banner")).toContainText("Por diversión");
    await expect(page.getByRole("button", { name: "Otra carta" })).toHaveCount(0);
  });

  test("un código de ficha Free abre el mismo jugador", async ({ page }) => {
    const origin = createCareer({
      playerSeed: "e2e-free-share",
      runSeed: "a",
      position: "PG",
      nationality: "ES",
      handed: "left",
      givenName: "Lola Ruiz",
    });
    const code = origin.meta.challengeCode;
    expect(code).toBeTruthy();

    await gotoFresh(page, "/");
    await dismissDevChrome(page);
    await page.getByLabel("Challenge").fill(code!);
    await page.getByRole("button", { name: "Jugar código" }).click();
    await expect(page).toHaveURL(/mode=challenge/);
    await expect(page.getByTestId("player-name")).toHaveText("Lola Ruiz");
    await expect(page.getByTestId("career-card")).toContainText("Base");
    await expect(page.getByTestId("career-card")).toContainText("España");
    await expect(page.getByTestId("career-card")).toContainText("Zurdo");
    await expect(page.getByRole("button", { name: "Otra carta" })).toHaveCount(0);
  });

  test("un código inválido no arranca", async ({ page }) => {
    await gotoFresh(page, "/");
    await dismissDevChrome(page);
    await page.getByLabel("Challenge").fill("NOPE");
    await page.getByRole("button", { name: "Jugar código" }).click();
    await expect(page.getByText("Código no válido")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});
