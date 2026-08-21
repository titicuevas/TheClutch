import { expect, test } from "@playwright/test";
import { dismissDevChrome, expectCareerIdentity, gotoFresh } from "./helpers";

test.describe("creador ligero", () => {
  test("elige nombre, posición, país y mano; el reroll conserva la identidad", async ({ page }) => {
    await gotoFresh(page, "/");
    await dismissDevChrome(page);
    await expect(page.getByRole("heading", { name: "THE CLUTCH" })).toBeVisible();

    await page.getByRole("button", { name: "PG Base" }).click();
    await page.getByRole("button", { name: "España" }).click();
    await page.getByRole("button", { name: "Zurdo" }).click();
    await page.getByLabel("Nombre").fill("Lola");
    await page.getByLabel("Apellido").fill("Ruiz");
    await page.getByRole("button", { name: "Empezar carrera" }).click();

    await expect(page).toHaveURL(/pos=PG/);
    await expect(page).toHaveURL(/nat=ES/);
    await expect(page).toHaveURL(/hand=left/);
    await expect(page).toHaveURL(/name=Lola(\+|%20)Ruiz/);
    await expectCareerIdentity(page, { pos: "Base", nat: "España", hand: "Zurdo" });
    await expect(page.getByTestId("player-name")).toHaveText("Lola Ruiz");
    await expect(page.getByTestId("decision-card")).toContainText("¿Dónde empiezas?");
    await expect(page.getByRole("button", { name: "Otra carta" })).toBeVisible();
    await expect(page.getByTestId("career-card")).toContainText(
      /Techo bajo|Jugador de rol|Techo de titular|Techo de estrella/,
    );

    await page.getByRole("button", { name: "Otra carta" }).click();
    await expect(page.getByTestId("player-name")).toHaveText("Lola Ruiz", { timeout: 8_000 });
    await expectCareerIdentity(page, { pos: "Base", nat: "España", hand: "Zurdo" });
    await expect(page).toHaveURL(/r1/);
  });

  test("sin nombre, el reroll cambia la carta y conserva pos/país/mano", async ({ page }) => {
    await gotoFresh(page, "/");
    await dismissDevChrome(page);
    await page.getByRole("button", { name: "PG Base" }).click();
    await page.getByRole("button", { name: "España" }).click();
    await page.getByRole("button", { name: "Zurdo" }).click();
    await page.getByRole("button", { name: "Empezar carrera" }).click();

    await expectCareerIdentity(page, { pos: "Base", nat: "España", hand: "Zurdo" });
    await expect(page.getByRole("button", { name: "Otra carta" })).toBeVisible();
    const before = await page.getByTestId("player-name").innerText();
    await page.getByRole("button", { name: "Otra carta" }).click();
    await expect(page.getByTestId("player-name")).not.toHaveText(before, { timeout: 8_000 });
    await expectCareerIdentity(page, { pos: "Base", nat: "España", hand: "Zurdo" });
  });

  test("sin elegir identidad, un toque llega a la carta", async ({ page }) => {
    await gotoFresh(page, "/");
    await dismissDevChrome(page);
    await page.getByRole("button", { name: "Empezar carrera" }).click();
    await expect(page.getByTestId("career-card")).toBeVisible();
    await expect(page.getByTestId("decision-card")).toBeVisible();
    await expect(page.getByTestId("player-name")).not.toHaveText("");
    await expect(page).not.toHaveURL(/pos=/);
    await expect(page).not.toHaveURL(/nat=/);
    await expect(page).not.toHaveURL(/hand=/);
  });

  test("solo el nombre no pega el apellido de la seed", async ({ page }) => {
    await gotoFresh(page, "/");
    await dismissDevChrome(page);
    await page.getByLabel("Nombre").fill("Lola");
    await page.getByRole("button", { name: "Empezar carrera" }).click();
    await expect(page.getByTestId("player-name")).toHaveText("Lola");
    await expect(page).toHaveURL(/name=Lola/);
    await expect(page).not.toHaveURL(/Ruiz/);
  });
});
