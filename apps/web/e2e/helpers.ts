import { expect, type Page } from "@playwright/test";

export async function gotoFresh(page: Page, path: string) {
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem("__tc_cleared")) {
        localStorage.clear();
        sessionStorage.setItem("__tc_cleared", "1");
      }
    } catch {
      /* ignore */
    }
  });
  await page.goto(path);
}

export async function dismissDevChrome(page: Page) {
  const collapse = page.getByRole("button", { name: "Collapse issues badge" });
  if (await collapse.isVisible().catch(() => false)) {
    await collapse.click().catch(() => undefined);
  }
}

export async function playUntil(page: Page, testId: "season-recap" | "legacy-card", maxSteps = 220) {
  for (let step = 0; step < maxSteps; step += 1) {
    await dismissDevChrome(page);
    if (await page.getByTestId(testId).isVisible().catch(() => false)) return step;
    if (testId === "season-recap" && (await page.getByTestId("legacy-card").isVisible().catch(() => false))) {
      throw new Error("llegó a legacy sin recap");
    }

    const recap = page.getByTestId("season-recap");
    if (await recap.isVisible().catch(() => false)) {
      if (testId === "season-recap") return step;
      await recap.getByRole("button", { name: "Ver el año" }).click();
      continue;
    }

    const decision = page.getByTestId("decision-card");
    if (await decision.isVisible().catch(() => false)) {
      await decision.locator("button").first().click();
      continue;
    }

    const cta = page.getByTestId("season-cta");
    if (await cta.isVisible().catch(() => false)) {
      await cta.click();
      continue;
    }

    throw new Error(`UI atascada en el paso ${step}`);
  }
  throw new Error(`no llegó a ${testId} en ${maxSteps} pasos`);
}

export async function expectCareerIdentity(page: Page, bits: { pos: string; nat: string; hand: string }) {
  const card = page.getByTestId("career-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText(bits.pos);
  await expect(card).toContainText(bits.nat);
  await expect(card).toContainText(bits.hand);
  await expect(card).not.toContainText(/potencial\s+\d/i);
}
