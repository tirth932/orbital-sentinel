import { expect, test, type Page } from "@playwright/test";

function watchPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  return errors;
}

async function openConsole(page: Page) {
  await page.goto("/console");
  await expect(page.getByRole("heading", { name: "Channel explorer" })).toBeVisible();
  await expect(page.getByText("Sample data")).toBeVisible();
  await expect(page.getByRole("img", { name: "Telemetry chart" })).toBeVisible();
}

test("console filters, scores, zooms, and locks channels without error files", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The channel sidebar is the desktop layout.");
  const errors = watchPageErrors(page);
  await openConsole(page);

  await expect(page.getByText("LSTM precision")).toBeVisible();
  await expect(page.getByText("100.0%").first()).toBeVisible();
  await expect(page.getByRole("table", { name: "Events" })).toContainText("Found");
  await expect(page.getByRole("table", { name: "Events" })).toContainText("Missed");
  await expect(page.getByText("Baseline flag")).toBeVisible();

  const baseline = page.getByRole("button", { name: "Baseline z-score" });
  await expect(baseline).toHaveAttribute("aria-pressed", "true");
  await baseline.click();
  await expect(baseline).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("Baseline flag")).toHaveCount(0);

  const chart = page.getByRole("img", { name: "Telemetry chart" });
  await expect(chart).toHaveAccessibleDescription(/Showing steps 0 to 899/);
  await chart.focus();
  await page.keyboard.press("+");
  await expect(chart).not.toHaveAccessibleDescription(/Showing steps 0 to 899/);
  await page.getByRole("button", { name: "Reset view" }).click();
  await expect(chart).toHaveAccessibleDescription(/Showing steps 0 to 899/);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(chart).not.toHaveAccessibleDescription(/Showing steps 0 to 899/);

  const slider = page.getByRole("slider", { name: /Threshold/ });
  await slider.focus();
  await slider.press("End");
  await expect(page.getByText("LSTM precision").locator("xpath=following-sibling::dd")).toHaveText("0.0%");
  await expect(page.getByRole("table", { name: "Events" })).not.toContainText("Found");
  await page.getByRole("button", { name: "Reset to model threshold" }).click();
  await expect(page.getByRole("slider", { name: "Threshold 1.2917" })).toBeVisible();
  await expect(page.getByText("LSTM precision").locator("xpath=following-sibling::dd")).toHaveText("100.0%");
  await expect(page.getByText("Dragging recomputes raw threshold crossings")).toBeVisible();

  await page.getByRole("button", { name: "MSL", exact: true }).click();
  await expect(page.getByRole("button", { name: /^M-1\s/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^P-1\s/ })).toHaveCount(0);

  await page.getByRole("button", { name: "All", exact: true }).first().click();
  await page.getByRole("searchbox", { name: "Channel" }).fill("zzzz");
  await expect(page.getByText("No channels match these filters.")).toBeVisible();
  await page.getByRole("searchbox", { name: "Channel" }).fill("P-6");
  await page.getByRole("button", { name: /^P-6\s/ }).click();
  await expect(page.getByText("Full-resolution error was not exported for this channel.")).toBeVisible();
  await expect(page.getByRole("slider", { name: /Threshold/ })).toBeDisabled();

  await page.getByRole("link", { name: "Back to orbit" }).click();
  await expect(page).toHaveURL("/");
  expect(errors).toEqual([]);
});

test("mobile console opens the channel drawer", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The drawer replaces the sidebar below 1024px.");
  const errors = watchPageErrors(page);
  await openConsole(page);
  await expect(page.getByRole("searchbox", { name: "Channel" })).toHaveCount(0);
  await page.getByRole("button", { name: "Channels" }).click();
  const search = page.getByRole("searchbox", { name: "Channel" });
  await expect(search).toBeVisible();
  await search.fill("M-3");
  await page.getByRole("button", { name: /^M-3\s/ }).click();
  await expect(page.getByRole("dialog", { name: "Channels" })).toBeHidden();
  await expect(page.getByText("M-3 · MSL")).toBeVisible();
  await expect(search).toBeHidden();
  expect(errors).toEqual([]);
});
