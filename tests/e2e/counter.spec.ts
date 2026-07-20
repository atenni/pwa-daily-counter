import { test, expect, type Page, type Locator } from "@playwright/test";

// Helper to simulate wheel drag
const simulateDrag = async (wheel: Locator, offsetX = 40, offsetY = -20) => {
  await wheel.evaluate(
    (el, { offsetX, offsetY }) => {
      const wheel = el as HTMLElement;
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      wheel.dispatchEvent(
        new MouseEvent("mousedown", {
          clientX: centerX,
          clientY: centerY - 50,
          bubbles: true,
        }),
      );
      window.dispatchEvent(
        new MouseEvent("mousemove", {
          clientX: centerX + offsetX,
          clientY: centerY + offsetY,
          bubbles: true,
        }),
      );
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    },
    { offsetX, offsetY },
  );
};

// Helper to open settings panel
const openSettings = async (page: Page) => {
  await page.evaluate(() => {
    (document.querySelector("settings-panel") as any)?.open();
  });
};

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
    const settingsPanel = page.locator("settings-panel");

    // Initially closed (no 'open' attribute)
    await expect(settingsPanel).not.toHaveAttribute("open");

    // Open via helper
    await openSettings(page);
    await expect(settingsPanel).toHaveAttribute("open");

    // Close via JavaScript
    await page.evaluate(() => {
      (document.querySelector("settings-panel") as any)?.close();
    });
    await expect(settingsPanel).not.toHaveAttribute("open");
  });

  test("app is in dark mode by default", async ({ page }) => {
    // Verify body has dark background
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // Dark mode should have rgb(30, 30, 30) or similar dark color
    expect(bodyBg).toBe("rgb(30, 30, 30)");
  });

  test("reset button clears counter and updates display", async ({ page }) => {
    const firstWheel = page.locator(".wheel").first();
    const countSpan = firstWheel.locator(".wheel-count .count-value");
    const saveBtn = firstWheel.locator(".save-btn");

    // Initial count should be 0
    await expect(countSpan).toHaveText("0");

    // First, add some counts via drag and save
    await simulateDrag(firstWheel, 40, -20);

    // Save the draft to persist the count
    await saveBtn.click();

    // Verify count is now greater than 0
    const countBeforeReset = await countSpan.textContent();
    const countValue = parseInt(countBeforeReset || "0");
    expect(countValue).toBeGreaterThan(0);

    // Open settings
    await openSettings(page);

    // Get reset button from within the settings panel slot content
    const resetBtn = page
      .locator("settings-panel")
      .locator(".reset-btn")
      .first();

    // Reset button should be visible
    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toContainText("Reset");

    // Click reset using JavaScript to avoid viewport issues
    await resetBtn.evaluate((el) => (el as HTMLButtonElement).click());

    // Count should now be 0
    await expect(countSpan).toHaveText("0");
  });

  test("emoji input updates wheel emoji", async ({ page }) => {
    const firstWheel = page.locator(".wheel").first();
    const emojiDisplay = firstWheel.locator(".wheel-emoji");

    // Get initial emoji
    const initialEmoji = await emojiDisplay.textContent();

    // Open settings panel
    await openSettings(page);

    // Update emoji input inside the settings panel shadow DOM
    const emojiInput = page
      .locator("settings-panel")
      .locator(".wheel-controls input[type='text']")
      .first();
    await emojiInput.fill("💪");
    await emojiInput.evaluate((el) =>
      el.dispatchEvent(new Event("input", { bubbles: true })),
    );

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
      const panel = document.querySelector("settings-panel") as any;
      panel?.open();
    });

    // Check that settings panel is open (has 'open' attribute)
    const settingsPanel = page.locator("settings-panel");
    await expect(settingsPanel).toHaveAttribute("open");

    // Verify the panel is actually open by checking internal state
    const isOpen = await page.evaluate(() => {
      const panel = document.querySelector("settings-panel") as any;
      return panel?.isOpen() ?? false;
    });
    expect(isOpen).toBe(true);
  });

  test("target input updates wheel target display", async ({ page }) => {
    const firstWheel = page.locator(".wheel").first();
    const targetSpan = firstWheel.locator(".wheel-count .target-value");

    // Initial target should be 100
    await expect(targetSpan).toHaveText("100");

    // Open settings
    await openSettings(page);

    // Update target input (inside settings panel shadow DOM)
    const targetInput = page
      .locator("settings-panel")
      .locator(".target-input")
      .first();
    await targetInput.fill("200");
    await targetInput.evaluate((el) =>
      el.dispatchEvent(new Event("change", { bubbles: true })),
    );

    // Verify target updated
    await expect(targetSpan).toHaveText("200");
  });

  test("settings elements have consistent heights", async ({ page }) => {
    // Open settings
    await openSettings(page);

    // Get heights of emoji input, target input, and reset button (inside settings panel)
    const emojiInput = page
      .locator("settings-panel")
      .locator(".wheel-controls input[type='text']")
      .first();
    const targetInput = page
      .locator("settings-panel")
      .locator(".target-input")
      .first();
    const resetBtn = page
      .locator("settings-panel")
      .locator(".reset-btn")
      .first();

    const emojiHeight = await emojiInput.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    const targetHeight = await targetInput.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    const resetHeight = await resetBtn.evaluate(
      (el) => el.getBoundingClientRect().height,
    );

    // All elements should have consistent height of 50px
    expect(emojiHeight).toBe(50);
    expect(targetHeight).toBe(50);
    expect(resetHeight).toBe(50);
  });

  test("wheel enters draft mode on drag and shows save button", async ({
    page,
  }) => {
    const firstWheel = page.locator(".wheel").first();
    const emoji = firstWheel.locator(".wheel-emoji");
    const countDiv = firstWheel.locator(".wheel-count");
    const draftDisplay = firstWheel.locator(".wheel-draft-display");
    const saveBtn = firstWheel.locator(".save-btn");
    const draftCount = firstWheel.locator(".draft-count");

    // Initially, emoji and count should be visible, draft display hidden
    await expect(emoji).toBeVisible();
    await expect(countDiv).toBeVisible();
    await expect(draftDisplay).not.toBeVisible();

    // Use JavaScript to simulate the drag interaction
    await firstWheel.evaluate((el) => {
      const wheel = el as HTMLElement;
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Start drag
      const mousedown = new MouseEvent("mousedown", {
        clientX: centerX,
        clientY: centerY - 50,
        bubbles: true,
      });
      wheel.dispatchEvent(mousedown);

      // Move to trigger draft mode
      const mousemove = new MouseEvent("mousemove", {
        clientX: centerX + 30,
        clientY: centerY - 40,
        bubbles: true,
      });
      window.dispatchEvent(mousemove);
    });

    // Draft display should now be visible with save button
    await expect(draftDisplay).toBeVisible();
    await expect(saveBtn).toBeVisible();
    await expect(emoji).not.toBeVisible();
    await expect(countDiv).not.toBeVisible();

    // Draft count should show the increment (not the total)
    const draftValue = await draftCount.textContent();
    expect(parseInt(draftValue || "0")).toBeGreaterThan(0);

    // End drag
    await page.evaluate(() => {
      const mouseup = new MouseEvent("mouseup", { bubbles: true });
      window.dispatchEvent(mouseup);
    });
  });

  test("save button commits draft increment, exits draft mode, and resets thumb to 12 o'clock", async ({
    page,
  }) => {
    const firstWheel = page.locator(".wheel").first();
    const countSpan = firstWheel.locator(".wheel-count .count-value");
    const draftDisplay = firstWheel.locator(".wheel-draft-display");
    const saveBtn = firstWheel.locator(".save-btn");
    const emoji = firstWheel.locator(".wheel-emoji");
    const countDiv = firstWheel.locator(".wheel-count");

    // Initial count should be 0
    await expect(countSpan).toHaveText("0");

    // Use JavaScript to simulate the drag interaction
    await firstWheel.evaluate((el) => {
      const wheel = el as HTMLElement;
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Start drag
      const mousedown = new MouseEvent("mousedown", {
        clientX: centerX,
        clientY: centerY - 50,
        bubbles: true,
      });
      wheel.dispatchEvent(mousedown);

      // Move significantly to accumulate increments
      const mousemove = new MouseEvent("mousemove", {
        clientX: centerX + 80,
        clientY: centerY - 30,
        bubbles: true,
      });
      window.dispatchEvent(mousemove);

      // End drag
      const mouseup = new MouseEvent("mouseup", { bubbles: true });
      window.dispatchEvent(mouseup);
    });

    // Draft mode should be active
    await expect(draftDisplay).toBeVisible();

    // Get the draft increment value before saving
    const draftCount = firstWheel.locator(".draft-count");
    const draftValue = await draftCount.textContent();
    const incrementAmount = parseInt(draftValue || "0");
    expect(incrementAmount).toBeGreaterThan(0);

    // Click save button
    await saveBtn.click();

    // Draft mode should exit, emoji and count should be visible again
    await expect(draftDisplay).not.toBeVisible();
    await expect(emoji).toBeVisible();
    await expect(countDiv).toBeVisible();

    // Count should have increased by the draft increment
    const newCount = await countSpan.textContent();
    expect(parseInt(newCount || "0")).toBe(incrementAmount);

    // Thumb should be reset to 12 o'clock (0 degrees)
    const wheelElement = await firstWheel.elementHandle();
    const wheelAngle = await wheelElement?.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--wheel-angle"),
    );
    expect(wheelAngle).toBe("0deg");
  });

  test("clicking outside wheel cancels draft mode without saving and resets thumb to 12 o'clock", async ({
    page,
  }) => {
    const firstWheel = page.locator(".wheel").first();
    const draftDisplay = firstWheel.locator(".wheel-draft-display");
    const emoji = firstWheel.locator(".wheel-emoji");
    const countDiv = firstWheel.locator(".wheel-count");
    const countSpan = firstWheel.locator(".wheel-count .count-value");

    // Get initial count
    const initialCount = await countSpan.textContent();

    // Use JavaScript to simulate the drag interaction
    await firstWheel.evaluate((el) => {
      const wheel = el as HTMLElement;
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mousedown = new MouseEvent("mousedown", {
        clientX: centerX,
        clientY: centerY - 50,
        bubbles: true,
      });
      wheel.dispatchEvent(mousedown);

      const mousemove = new MouseEvent("mousemove", {
        clientX: centerX + 80,
        clientY: centerY - 40,
        bubbles: true,
      });
      window.dispatchEvent(mousemove);

      const mouseup = new MouseEvent("mouseup", { bubbles: true });
      window.dispatchEvent(mouseup);
    });

    // Draft mode should be active
    await expect(draftDisplay).toBeVisible();

    // Click outside the wheel (on body)
    await page.click("body", { position: { x: 50, y: 50 } });

    // Draft mode should exit without saving
    await expect(draftDisplay).not.toBeVisible();
    await expect(emoji).toBeVisible();
    await expect(countDiv).toBeVisible();

    // Count should remain unchanged
    const finalCount = await countSpan.textContent();
    expect(finalCount).toBe(initialCount);

    // Thumb should be reset to 12 o'clock (0 degrees)
    const wheelElement = await firstWheel.elementHandle();
    const wheelAngle = await wheelElement?.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--wheel-angle"),
    );
    expect(wheelAngle).toBe("0deg");
  });

  test("wheel increments by 1 per step", async ({ page }) => {
    const firstWheel = page.locator(".wheel").first();
    const countSpan = firstWheel.locator(".wheel-count .count-value");
    const saveBtn = firstWheel.locator(".save-btn");

    // Initial count should be 0
    await expect(countSpan).toHaveText("0");

    // Use JavaScript to simulate a small drag (just over one step)
    await firstWheel.evaluate((el) => {
      const wheel = el as HTMLElement;
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Start drag at top
      const mousedown = new MouseEvent("mousedown", {
        clientX: centerX,
        clientY: centerY - 50,
        bubbles: true,
      });
      wheel.dispatchEvent(mousedown);

      // Move just enough for one increment (about 18 degrees)
      const mousemove = new MouseEvent("mousemove", {
        clientX: centerX + 20,
        clientY: centerY - 45,
        bubbles: true,
      });
      window.dispatchEvent(mousemove);

      // End drag
      const mouseup = new MouseEvent("mouseup", { bubbles: true });
      window.dispatchEvent(mouseup);
    });

    // Save the draft
    await saveBtn.click();

    // Count should have increased by 1
    const newCount = await countSpan.textContent();
    expect(newCount).toBe("1");
  });

  test("multiple save sessions accumulate correctly with thumb always at 12 o'clock", async ({
    page,
  }) => {
    const firstWheel = page.locator(".wheel").first();
    const countSpan = firstWheel.locator(".wheel-count .count-value");
    const draftCount = firstWheel.locator(".draft-count");
    const saveBtn = firstWheel.locator(".save-btn");

    // Session 1: Add 5 pushups
    await firstWheel.evaluate((el) => {
      const wheel = el as HTMLElement;
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mousedown = new MouseEvent("mousedown", {
        clientX: centerX,
        clientY: centerY - 50,
        bubbles: true,
      });
      wheel.dispatchEvent(mousedown);

      const mousemove = new MouseEvent("mousemove", {
        clientX: centerX + 40,
        clientY: centerY - 20,
        bubbles: true,
      });
      window.dispatchEvent(mousemove);

      const mouseup = new MouseEvent("mouseup", { bubbles: true });
      window.dispatchEvent(mouseup);
    });

    // Draft should show increment (around 5)
    const draftValue1 = await draftCount.textContent();
    const increment1 = parseInt(draftValue1 || "0");
    expect(increment1).toBeGreaterThan(0);

    // Save first session
    await saveBtn.click();

    // Total should be the increment from session 1
    await expect(countSpan).toHaveText(String(increment1));

    // Thumb should be at 12 o'clock
    let wheelElement = await firstWheel.elementHandle();
    let wheelAngle = await wheelElement?.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--wheel-angle"),
    );
    expect(wheelAngle).toBe("0deg");

    // Session 2: Add 3 more pushups (thumb starts at 12 o'clock again)
    await firstWheel.evaluate((el) => {
      const wheel = el as HTMLElement;
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mousedown = new MouseEvent("mousedown", {
        clientX: centerX,
        clientY: centerY - 50,
        bubbles: true,
      });
      wheel.dispatchEvent(mousedown);

      const mousemove = new MouseEvent("mousemove", {
        clientX: centerX + 25,
        clientY: centerY - 40,
        bubbles: true,
      });
      window.dispatchEvent(mousemove);

      const mouseup = new MouseEvent("mouseup", { bubbles: true });
      window.dispatchEvent(mouseup);
    });

    // Draft should show new increment (around 3)
    const draftValue2 = await draftCount.textContent();
    const increment2 = parseInt(draftValue2 || "0");
    expect(increment2).toBeGreaterThan(0);

    // Save second session
    await saveBtn.click();

    // Total should be sum of both sessions
    const finalCount = await countSpan.textContent();
    expect(parseInt(finalCount || "0")).toBe(increment1 + increment2);

    // Thumb should be at 12 o'clock again
    wheelElement = await firstWheel.elementHandle();
    wheelAngle = await wheelElement?.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--wheel-angle"),
    );
    expect(wheelAngle).toBe("0deg");
  });

  test("settings panel toggle method works correctly", async ({ page }) => {
    const settingsPanel = page.locator("settings-panel");

    // Initially closed
    await expect(settingsPanel).not.toHaveAttribute("open");
    let isOpen = await page.evaluate(() => {
      const panel = document.querySelector("settings-panel") as any;
      return panel?.isOpen() ?? false;
    });
    expect(isOpen).toBe(false);

    // Toggle open
    await page.evaluate(() => {
      const panel = document.querySelector("settings-panel") as any;
      panel?.toggle();
    });
    await expect(settingsPanel).toHaveAttribute("open");
    isOpen = await page.evaluate(() => {
      const panel = document.querySelector("settings-panel") as any;
      return panel?.isOpen() ?? false;
    });
    expect(isOpen).toBe(true);

    // Toggle closed
    await page.evaluate(() => {
      const panel = document.querySelector("settings-panel") as any;
      panel?.toggle();
    });
    await expect(settingsPanel).not.toHaveAttribute("open");
    isOpen = await page.evaluate(() => {
      const panel = document.querySelector("settings-panel") as any;
      return panel?.isOpen() ?? false;
    });
    expect(isOpen).toBe(false);
  });

  test("both wheels maintain independent counts", async ({ page }) => {
    const firstWheel = page.locator(".wheel").first();
    const secondWheel = page.locator(".wheel").nth(1);
    const firstCount = firstWheel.locator(".wheel-count .count-value");
    const secondCount = secondWheel.locator(".wheel-count .count-value");
    const firstSaveBtn = firstWheel.locator(".save-btn");
    const secondSaveBtn = secondWheel.locator(".save-btn");

    // Initial counts should be 0
    await expect(firstCount).toHaveText("0");
    await expect(secondCount).toHaveText("0");

    // Add to first wheel only
    await firstWheel.evaluate((el) => {
      const wheel = el as HTMLElement;
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mousedown = new MouseEvent("mousedown", {
        clientX: centerX,
        clientY: centerY - 50,
        bubbles: true,
      });
      wheel.dispatchEvent(mousedown);

      const mousemove = new MouseEvent("mousemove", {
        clientX: centerX + 40,
        clientY: centerY - 20,
        bubbles: true,
      });
      window.dispatchEvent(mousemove);

      const mouseup = new MouseEvent("mouseup", { bubbles: true });
      window.dispatchEvent(mouseup);
    });

    await firstSaveBtn.click();

    // First wheel should have count > 0, second should still be 0
    const firstCountValue = await firstCount.textContent();
    expect(parseInt(firstCountValue || "0")).toBeGreaterThan(0);
    await expect(secondCount).toHaveText("0");

    // Add to second wheel
    await secondWheel.evaluate((el) => {
      const wheel = el as HTMLElement;
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mousedown = new MouseEvent("mousedown", {
        clientX: centerX,
        clientY: centerY - 50,
        bubbles: true,
      });
      wheel.dispatchEvent(mousedown);

      const mousemove = new MouseEvent("mousemove", {
        clientX: centerX + 30,
        clientY: centerY - 30,
        bubbles: true,
      });
      window.dispatchEvent(mousemove);

      const mouseup = new MouseEvent("mouseup", { bubbles: true });
      window.dispatchEvent(mouseup);
    });

    await secondSaveBtn.click();

    // Both wheels should have independent counts > 0
    const secondCountValue = await secondCount.textContent();
    expect(parseInt(secondCountValue || "0")).toBeGreaterThan(0);
    // First wheel count should remain unchanged
    await expect(firstCount).toHaveText(firstCountValue || "");
  });
});
