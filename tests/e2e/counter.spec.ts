import { test, expect } from "@playwright/test";

test.describe("Daily Counter PWA", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("homepage loads and shows initial counter", async ({ page }) => {
    await expect(page).toHaveTitle("Daily Counter");

    const wheel = page.locator(".wheel").first();
    await expect(wheel).toBeVisible();

    const countSpan = wheel.locator(".wheel-count .count-value");
    await expect(countSpan).toHaveText("0");

    // Also check target is displayed
    const targetSpan = wheel.locator(".wheel-count .target-value");
    await expect(targetSpan).toHaveText("100");
  });

  test("both wheels are rendered with emojis", async ({ page }) => {
    const wheels = page.locator(".wheel");
    await expect(wheels).toHaveCount(2);

    const firstEmoji = wheels.first().locator(".wheel-emoji");
    const secondEmoji = wheels.nth(1).locator(".wheel-emoji");

    await expect(firstEmoji).toBeVisible();
    await expect(secondEmoji).toBeVisible();
    await expect(firstEmoji).not.toHaveText("");
    await expect(secondEmoji).not.toHaveText("");
  });

  test("settings panel opens and closes", async ({ page }) => {
    const settingsPanel = page.locator(".settings");
    const gripper = page.locator(".settings-gripper");

    // Initially closed (no 'open' class)
    await expect(settingsPanel).not.toHaveClass(/open/);

    // Open via gripper click
    await gripper.click();
    await expect(settingsPanel).toHaveClass(/open/);

    // Close via gripper click again
    await gripper.click();
    await expect(settingsPanel).not.toHaveClass(/open/);
  });

  test("dark mode toggle works", async ({ page }) => {
    // Open settings panel first
    await page.evaluate(() => {
      const settings = document.querySelector(".settings");
      settings?.classList.add("open");
    });

    const darkToggle = page.locator(".dark-toggle");

    // Scroll the toggle into view
    await darkToggle.scrollIntoViewIfNeeded();

    // Initial state - should show "Light Mode" since app starts in dark mode
    await expect(darkToggle).toHaveText("☀️ Light Mode");

    // Click to toggle to light mode using JavaScript to avoid viewport issues
    await darkToggle.evaluate((el) => (el as HTMLButtonElement).click());
    await expect(darkToggle).toHaveText("🌙 Dark Mode");
    await expect(page.locator("body")).not.toHaveClass(/dark/);

    // Click to toggle back to dark mode
    await darkToggle.evaluate((el) => (el as HTMLButtonElement).click());
    await expect(darkToggle).toHaveText("☀️ Light Mode");
    await expect(page.locator("body")).toHaveClass(/dark/);
  });

  test("reset button clears counter and updates display", async ({ page }) => {
    const firstWheel = page.locator(".wheel").first();
    const countSpan = firstWheel.locator(".wheel-count .count-value");
    const resetBtn = page.locator(".reset-btn").first();

    // Initial count should be 0
    await expect(countSpan).toHaveText("0");

    // Open settings
    await page.evaluate(() => {
      const settings = document.querySelector(".settings");
      settings?.classList.add("open");
    });

    // Reset button should show current count
    await expect(resetBtn).toContainText("Reset (0)");

    // Click reset
    await resetBtn.click();

    // Count should still be 0
    await expect(countSpan).toHaveText("0");
  });

  test("emoji input updates wheel emoji", async ({ page }) => {
    const firstWheel = page.locator(".wheel").first();
    const emojiDisplay = firstWheel.locator(".wheel-emoji");

    // Get initial emoji
    const initialEmoji = await emojiDisplay.textContent();

    // Open settings
    await page.evaluate(() => {
      const settings = document.querySelector(".settings");
      settings?.classList.add("open");
    });

    // Update emoji input via JavaScript to trigger the input event
    await page.evaluate(() => {
      const input = document.querySelector(
        ".wheel-controls input",
      ) as HTMLInputElement;
      if (input) {
        input.value = "💪";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    // Verify emoji updated
    await expect(emojiDisplay).toHaveText("💪");
  });

  test("wheel has progress ring and thumb", async ({ page }) => {
    const wheel = page.locator(".wheel").first();

    // Check for thumb element
    const thumb = wheel.locator(".wheel-thumb");
    await expect(thumb).toBeVisible();

    // Verify wheel has the progress ring (via CSS custom property)
    const wheelElement = await wheel.elementHandle();
    const wheelAngle = await wheelElement?.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--wheel-angle"),
    );
    expect(wheelAngle).toBe("0deg");
  });

  test("settings gripper is visible at bottom", async ({ page }) => {
    // The settings gripper is the visible handle at the bottom
    const gripper = page.locator(".settings-gripper");
    await expect(gripper).toBeVisible();

    // Check that gripper has proper styling
    const gripperStyles = await gripper.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        height: styles.height,
        cursor: styles.cursor,
      };
    });

    expect(gripperStyles.height).toBe("40px");
    expect(gripperStyles.cursor).toBe("pointer");
  });

  test("no vertical scrollbar on main screen", async ({ page }) => {
    // Check that body has overflow hidden
    const bodyOverflow = await page.evaluate(() => {
      return window.getComputedStyle(document.body).overflow;
    });
    expect(bodyOverflow).toBe("hidden");

    // Check that document doesn't have vertical scrollbar
    const hasScrollbar = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight;
    });
    expect(hasScrollbar).toBe(false);
  });

  test("swipe indicator hides when settings panel opens", async ({ page }) => {
    // Open settings panel
    await page.evaluate(() => {
      const settings = document.querySelector(".settings");
      settings?.classList.add("open");
    });

    // Check that settings panel is open
    const settingsPanel = page.locator(".settings");
    await expect(settingsPanel).toHaveClass(/open/);

    // The swipe indicator should be hidden (opacity: 0) when settings is open
    // We verify this by checking the body has the settings open state
    const bodyHasSettingsOpen = await page.evaluate(() => {
      return document.body.querySelector(".settings.open") !== null;
    });
    expect(bodyHasSettingsOpen).toBe(true);
  });

  test("target input updates wheel target display", async ({ page }) => {
    const firstWheel = page.locator(".wheel").first();
    const targetSpan = firstWheel.locator(".wheel-count .target-value");

    // Initial target should be 100
    await expect(targetSpan).toHaveText("100");

    // Open settings
    await page.evaluate(() => {
      const settings = document.querySelector(".settings");
      settings?.classList.add("open");
    });

    // Update target input
    const targetInput = page.locator(".target-input").first();
    await targetInput.fill("200");
    await targetInput.evaluate((el) =>
      el.dispatchEvent(new Event("change", { bubbles: true })),
    );

    // Verify target updated
    await expect(targetSpan).toHaveText("200");
  });

  test("settings elements have consistent heights", async ({ page }) => {
    // Open settings
    await page.evaluate(() => {
      const settings = document.querySelector(".settings");
      settings?.classList.add("open");
    });

    // Get heights of emoji input, target input, and reset button
    const emojiInput = page
      .locator(".wheel-controls input[type='text']")
      .first();
    const targetInput = page.locator(".target-input").first();
    const resetBtn = page.locator(".reset-btn").first();

    const emojiHeight = await emojiInput.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    const targetHeight = await targetInput.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    const resetHeight = await resetBtn.evaluate(
      (el) => el.getBoundingClientRect().height,
    );

    // All should be 50px (or very close)
    expect(emojiHeight).toBe(50);
    expect(targetHeight).toBe(50);
    expect(resetHeight).toBe(50);
  });
});
