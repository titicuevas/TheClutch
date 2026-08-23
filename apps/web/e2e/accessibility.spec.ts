import { expect, test } from "@playwright/test";
import { dismissDevChrome, gotoFresh } from "./helpers";

for (const viewport of [{ name: "móvil", width: 393, height: 852 }, { name: "tablet", width: 820, height: 1180 }]) {
  test(`landing accesible en ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await gotoFresh(page, "/");
    await dismissDevChrome(page);
    await expect(page.getByRole("heading", { level: 1, name: "THE CLUTCH" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver el reto de hoy" })).toBeInViewport();
    await expect(page.getByLabel("Nombre")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Enlaces del sitio" })).toBeVisible();
    const undersized = await page.locator("button, a, input, select, textarea").evaluateAll((nodes) => nodes.filter((node) => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return node.getAttribute("aria-label") !== "Open Next.js Dev Tools" && style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0 && box.height < 40;
    }).map((node) => (node.textContent || node.getAttribute("aria-label") || node.tagName).trim()));
    expect(undersized).toEqual([]);
  });
}

test("el formulario de feedback explica el envío y tiene etiquetas", async ({ page }) => {
  await gotoFresh(page, "/feedback");
  await expect(page.getByRole("heading", { level: 1, name: "Ayúdanos a afinar la carrera" })).toBeVisible();
  await expect(page.getByText(/guardaremos estos cuatro campos/)).toBeVisible();
  await expect(page.getByLabel("Dispositivo")).toBeVisible();
  await expect(page.getByLabel("¿Dónde estabas?")).toBeVisible();
  await expect(page.getByLabel("¿Qué mejorarías?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar feedback" })).toBeVisible();
});

test("manifest, observabilidad y telemetría mínima responden", async ({ page, request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).name).toContain("TheClutch");
  expect((await request.get("/sw.js")).ok()).toBeTruthy();
  const accepted = await request.post("/api/telemetry", { data: { event: "landing_view", viewport: "mobile" } });
  expect(accepted.status()).toBe(204);
  const rejected = await request.post("/api/telemetry", { data: { event: "player_name", viewport: "mobile" } });
  expect(rejected.status()).toBe(400);
  const invalidFeedback = await request.post("/api/feedback", { data: { rating: 8, device: "móvil", moment: "Inicio", comment: "Prueba inválida" } });
  expect(invalidFeedback.status()).toBe(400);
  const validFeedbackWithoutDatabase = await request.post("/api/feedback", { data: { rating: 4, device: "móvil", moment: "Inicio", comment: "Prueba válida sin base de datos" } });
  expect(validFeedbackWithoutDatabase.status()).toBe(503);
  const acceptedError = await request.post("/api/client-error", { data: { category: "runtime_error", route: "play" } });
  expect(acceptedError.status()).toBe(204);
  const rejectedError = await request.post("/api/client-error", { data: { category: "secret_stack", route: "/private/path" } });
  expect(rejectedError.status()).toBe(400);
  const statusPage = await request.get("/estado");
  expect(statusPage.ok()).toBeTruthy();
  expect(await statusPage.text()).toContain("Métricas no disponibles");
  await gotoFresh(page, "/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
});
