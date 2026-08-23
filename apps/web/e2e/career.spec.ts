import { expect, test } from "@playwright/test";
import { dismissDevChrome, gotoFresh, playUntil } from "./helpers";

test.describe("carrera happy path", () => {
  test("demo-01 llega al recap de la primera temporada", async ({ page }) => {
    await gotoFresh(page, "/play?seed=demo-01&pos=PG");
    await dismissDevChrome(page);
    await expect(page.getByTestId("career-card")).toBeVisible();
    await expect(page.getByTestId("player-name")).toHaveText("Jovan Markovic");
    await expect(page.getByTestId("career-card")).toContainText("Base");
    await expect(page.getByTestId("career-card")).not.toContainText(/\bPG\b/);
    await expect(page.getByTestId("career-card")).toContainText("min");
    await expect(page.getByTestId("career-card")).toContainText("Sin circuito");
    await expect(page.getByTestId("career-card")).not.toContainText("sueldo");
    await expect(page.getByTestId("career-card")).toContainText("Forma");
    await expect(page.getByTestId("career-card")).toContainText("Ánimo");
    await expect(page.getByTestId("career-card")).toContainText(
      /Techo bajo|Jugador de rol|Techo de titular|Techo de estrella/,
    );
    await expect(page.getByTestId("career-card")).not.toContainText(/Finishing|Star upside|Sharpshooter/);
    await expect(page.getByRole("button", { name: "Simular temporada" })).toHaveCount(0);
    await expect(page.getByTestId("decision-card")).toBeVisible();
    await expect(page.getByTestId("decision-card")).toContainText("¿Dónde empiezas?");
    await expect(page.getByRole("button", { name: "Otra carta" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Seguir (hasta decisión)" })).toHaveCount(0);

    const steps = await playUntil(page, "season-recap", 30);
    const recap = page.getByTestId("season-recap");
    await expect(recap).toContainText("Temporada 1");
    await expect(recap).toContainText("PTS");
    await expect(recap.getByTestId("season-grade")).toBeVisible();
    await expect(recap).toContainText("Nota del año");
    await expect(recap.getByTestId("season-choices")).toContainText("Ruta");
    await expect(recap.getByTestId("season-choices")).toContainText("Entrenamiento");
    const gradeBox = await recap.getByTestId("season-grade").boundingBox();
    const cutsBox = await recap.getByTestId("season-choices").boundingBox();
    expect(gradeBox && cutsBox && gradeBox.y < cutsBox.y).toBeTruthy();
    await expect(recap.getByTestId("season-note")).toHaveCount(0);
    await expect(recap.getByTestId("team-record")).toHaveText(/^\d+-\d+$/);
    await expect(recap.getByRole("button", { name: "Ver el año" })).toBeVisible();
    expect(steps).toBeLessThan(30);
  });

  test("una carrera completa llega a la carta de legacy", async ({ page }) => {
    await gotoFresh(page, "/play?seed=e2e-career&pos=PG&nat=ES&hand=right");
    await dismissDevChrome(page);
    await expect(page.getByTestId("career-card")).toBeVisible();

    await playUntil(page, "legacy-card", 220);
    const legacy = page.getByTestId("legacy-card");
    await expect(legacy).toContainText("Legacy");
    await expect(legacy).toContainText("temporadas");
    await expect(legacy).toContainText("Pico OVR");
    await expect(legacy).toContainText("PPG");
    await expect(legacy).toContainText("Legacy score");
    await expect(legacy.getByTestId("legacy-band")).toBeVisible();
    await expect(legacy.getByTestId("legacy-band")).toHaveText(
      /Leyenda local|Estrella nacional|Continental|Histórico/,
    );
    await expect(legacy).toContainText("TAP");
    await expect(legacy.getByTestId("legacy-national")).toHaveText(/Selección|Sin selección/);
    await expect(legacy.getByRole("link", { name: "Otra carrera" })).toBeVisible();
    await expect(legacy.getByRole("button", { name: "Copiar ficha" })).toBeVisible();
    await expect(legacy).toContainText("Ganado");
    await expect(legacy.getByTestId("legacy-share")).toContainText("Challenge BK1-X-");
  });

  test("un refresh conserva la temporada jugada", async ({ page }) => {
    await gotoFresh(page, "/play?seed=e2e-save&pos=PG");
    await dismissDevChrome(page);
    await playUntil(page, "season-recap", 30);
    await page.getByRole("button", { name: "Ver el año" }).click();
    await expect(page.getByTestId("career-timeline")).toBeVisible();
    await expect(page.getByTestId("stint-block")).toBeVisible();
    const lastYear = page.getByTestId("season-row-1");
    await expect(lastYear).toBeVisible();
    await expect(lastYear).toContainText("Temporada 1");
    await expect(lastYear.getByTestId("team-record")).toHaveText(/^\d+-\d+$/);
    await expect(lastYear).toHaveAttribute("data-focus", "true");
    await expect(lastYear).toBeInViewport();
    await expect(page.getByTestId("identity-strip")).toBeVisible();
    await expect(page.getByTestId("identity-strip")).toContainText("Base");
    await expect(page.getByTestId("identity-strip")).toContainText("$");
    await expect(page.getByTestId("identity-strip")).toContainText("min");
    await expect(page.getByTestId("career-card")).not.toContainText("Forma");
    await expect(page.getByLabel("Ir al año")).toHaveValue("1");
    await expect(page.getByTestId("season-cta")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retirarse" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("career-timeline")).toBeVisible();
    await expect(page.getByTestId("season-row-1")).toBeVisible();
  });
});
