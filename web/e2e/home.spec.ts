import { expect, test, type Page } from "@playwright/test";

function watchPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  return errors;
}

test("home shows sample metrics, sections, and paper numbers", async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ORBITAL SENTINEL" })).toBeVisible();
  await expect(page.getByText("Sample data").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Mission Console" })).toBeVisible();

  const summary = page.getByRole("region", { name: "Run summary" });
  await expect(summary).toContainText("82");
  await expect(summary).toContainText("105");
  await expect(summary).toContainText("81.7%");
  await expect(summary).toContainText("63.8%");
  await expect(summary).toContainText("47.6%");

  await page.getByRole("link", { name: "Method" }).click();
  await expect(page.getByRole("heading", { name: "How a channel becomes a flag" })).toBeInViewport();

  await page.getByRole("link", { name: "Results" }).click();
  await expect(page.getByRole("heading", { name: "LSTM against a 3-sigma baseline" })).toBeInViewport();
  await expect(page.getByText("not measurements from a trained model")).toBeVisible();
  await expect(page.getByText("87.5% precision and 80.0% recall")).toBeVisible();

  await page.getByRole("tab", { name: "MSL" }).click();
  const table = page.getByRole("table", { name: "Event-level scores, MSL" });
  await expect(table.getByRole("row", { name: /LSTM/ })).toContainText("81.5%");

  await page.getByRole("link", { name: "Globe" }).click();
  await expect(page.getByRole("heading", { name: /105 events/ })).toBeInViewport();
  await page.locator("#anomaly-select").selectOption("P-1-1");
  await expect(page.locator("#globe dl")).toContainText("Missed");
  await expect(page.locator("#globe dl")).toContainText("560–567");

  await page.getByRole("link", { name: "Limits" }).click();
  await expect(page.getByRole("heading", { name: "What this run does not claim" })).toBeInViewport();
  expect(errors).toEqual([]);
});

test("missing routes and public data respond", async ({ page }) => {
  const lost = await page.goto("/no-such-channel");
  expect(lost?.status()).toBe(404);
  await expect(page.getByText("404 / SIGNAL LOST")).toBeVisible();

  const results = await page.request.get("/data/results.json");
  expect(results.ok()).toBeTruthy();
  expect(results.headers()["cache-control"]).toContain("max-age=3600");
  const body = (await results.json()) as { is_sample: boolean; counts: { channels: number } };
  expect(body.is_sample).toBe(true);
  expect(body.counts.channels).toBe(82);

  const robots = await page.request.get("/robots.txt");
  expect(await robots.text()).toContain("Sitemap:");
  const sitemap = await page.request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain("/console");
});
