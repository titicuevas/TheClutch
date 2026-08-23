import { expect, test } from "@playwright/test";
import { dismissDevChrome, gotoFresh } from "./helpers";

for (const viewport of [{ name: "móvil", width: 393, height: 852 }, { name: "tablet", width: 820, height: 1180 }]) {
  test(`landing accesible en ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await gotoFresh(page, "/");
    await dismissDevChrome(page);
    await expect(page.getByRole("heading", { level: 1, name: "THE CLUTCH" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Jugar ahora" })).toBeInViewport();
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
  await expect(page.getByText("No se envía nada a TheClutch automáticamente.")).toBeVisible();
  await expect(page.getByLabel("Dispositivo")).toBeVisible();
  await expect(page.getByLabel("¿Dónde estabas?")).toBeVisible();
  await expect(page.getByLabel("¿Qué mejorarías?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Preparar feedback" })).toBeVisible();
});
