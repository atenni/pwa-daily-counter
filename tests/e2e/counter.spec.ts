import { test, expect, type Page, type Locator } from "@playwright/test";

// Helper to simulate wheel drag
// offsetX/Y control the drag direction and distance. Default values provide ~1-2 increments.
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

// Helper to open settings panel via JavaScript API
const openSettings = async (page: Page) => {
  await page.evaluate(() => {
    (document.querySelector("settings-panel") as any)?.open();
  });
};

// Helper to check if a color is dark (for dark mode testing)
const isDarkColor = (rgb: string): boolean => {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return false;
  const [, r, g, b] = match.map(Number);
  // Calculate perceived brightness (YIQ formula)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
};

test.describe("Daily Counter PWA", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("homepage loads and shows initial counter", async ({ page }) => {
    await expect(page).toHaveTitle("Daily Counter");

    // Use data-testid selectors for stability
    const wheel = page.locator('[data-testid="wheel-wheelA"]');
    await expect(wheel).toBeVisible();

    const countSpan = page.locator('[data-testid="count-value-wheelA"]');
    await expect(countSpan).toHaveText("0");

    const targetSpan = page.locator('[data-testid="target-value-wheelA"]');
    await expect(targetSpan).toHaveText("100");
  });

  test("both wheels are rendered with emojis", async ({ page }) => {
    const firstEmoji = page.locator('[data-testid="wheel-emoji-wheelA"]');
    const secondEmoji = page.locator('[data-testid="wheel-emoji-wheelB"]');

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
    // Verify body has dark background using brightness check instead of exact RGB
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    expect(isDarkColor(bodyBg)).toBe(true);
  });

  test("reset button clears counter and updates display", async ({ page }) => {
    const countSpan = page.locator('[data-testid="count-value-wheelA"]');
    const saveBtn = page.locator('[data-testid="save-btn-wheelA"]');

    // Initial count should be 0
    await expect(countSpan).toHaveText("0");

    // First, add some counts via drag and save
    const firstWheel = page.locator('[data-testid="wheel-wheelA"]');
    await simulateDrag(firstWheel, 40, -20);
    await saveBtn.click();

    // Verify count is now greater than 0
    const countBeforeReset = await countSpan.textContent();
    const countValue = parseInt(countBeforeReset || "0", 10);
    expect(countValue).toBeGreaterThan(0);

    // Open settings and reset
    await openSettings(page);
    const resetBtn = page.locator("settings-panel .reset-btn").first();
    await resetBtn.evaluate((el) => (el as HTMLButtonElement).click());

    // Count should now be 0
    await expect(countSpan).toHaveText("0");
  });

  test("emoji input updates wheel emoji", async ({ page }) => {
    const emojiDisplay = page.locator('[data-testid="wheel-emoji-wheelA"]');

    // Open settings panel
    await openSettings(page);

    // Update emoji input using stable selector
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
    const wheel = page.locator('[data-testid="wheel-wheelA"]');

    // Check for thumb element using data-testid
    const thumb = page.locator('[data-testid="wheel-thumb-wheelA"]');
    await expect(thumb).toBeVisible();

    // Verify wheel has the progress ring (via CSS custom property)
    const wheelAngle = await wheel.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--wheel-angle"),
    );
    expect(wheelAngle).toBe("0deg");
  });

  test("settings gripper is visible and clickable", async ({ page }) => {
    // The settings gripper is the visible handle at the bottom
    const gripper = page.locator('[data-testid="settings-gripper"]');
    await expect(gripper).toBeVisible();

    // Check that gripper is clickable (has pointer cursor)
    const cursor = await gripper.evaluate(
      (el) => window.getComputedStyle(el).cursor,
    );
    expect(cursor).toBe("pointer");
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

  test("target input updates wheel target display", async ({ page }) => {
    const targetSpan = page.locator('[data-testid="target-value-wheelA"]');

    // Initial target should be 100
    await expect(targetSpan).toHaveText("100");

    // Open settings and update target
    await openSettings(page);
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

  test("wheel enters draft mode on drag and shows save button", async ({
    page,
  }) => {
    const firstWheel = page.locator('[data-testid="wheel-wheelA"]');
    const emoji = page.locator('[data-testid="wheel-emoji-wheelA"]');
    const countDiv = page
      .locator('[data-testid="count-value-wheelA"]')
      .locator("..");
    const draftDisplay = page.locator('[data-testid="draft-display-wheelA"]');
    const saveBtn = page.locator('[data-testid="save-btn-wheelA"]');
    const draftCount = page.locator('[data-testid="draft-count-wheelA"]');

    // Initially, emoji and count should be visible, draft display hidden
    await expect(emoji).toBeVisible();
    await expect(draftDisplay).not.toBeVisible();

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

    // Draft count should show the increment (not the total)
    const draftValue = await draftCount.textContent();
    expect(parseInt(draftValue || "0", 10)).toBeGreaterThan(0);

    // End drag
    await page.evaluate(() => {
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
  });

  test("save button commits draft increment, exits draft mode, and resets thumb to 12 o'clock", async ({
    page,
  }) => {
    const firstWheel = page.locator('[data-testid="wheel-wheelA"]');
    const countSpan = page.locator('[data-testid="count-value-wheelA"]');
    const draftDisplay = page.locator('[data-testid="draft-display-wheelA"]');
    const saveBtn = page.locator('[data-testid="save-btn-wheelA"]');
    const emoji = page.locator('[data-testid="wheel-emoji-wheelA"]');

    await expect(countSpan).toHaveText("0");

    // Simulate drag
    await firstWheel.evaluate((el) => {
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
          clientX: centerX + 80,
          clientY: centerY - 30,
          bubbles: true,
        }),
      );
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });

    await expect(draftDisplay).toBeVisible();

    const draftCount = page.locator('[data-testid="draft-count-wheelA"]');
    const draftValue = await draftCount.textContent();
    const incrementAmount = parseInt(draftValue || "0", 10);
    expect(incrementAmount).toBeGreaterThan(0);

    await saveBtn.click();

    // Draft mode should exit
    await expect(draftDisplay).not.toBeVisible();
    await expect(emoji).toBeVisible();

    // Count should have increased
    const newCount = await countSpan.textContent();
    expect(parseInt(newCount || "0", 10)).toBe(incrementAmount);

    // Thumb should be reset to 12 o'clock
    const wheelAngle = await firstWheel.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--wheel-angle"),
    );
    expect(wheelAngle).toBe("0deg");
  });

  test("clicking outside wheel cancels draft mode without saving and resets thumb to 12 o'clock", async ({
    page,
  }) => {
    const firstWheel = page.locator('[data-testid="wheel-wheelA"]');
    const draftDisplay = page.locator('[data-testid="draft-display-wheelA"]');
    const emoji = page.locator('[data-testid="wheel-emoji-wheelA"]');
    const countSpan = page.locator('[data-testid="count-value-wheelA"]');

    const initialCount = await countSpan.textContent();

    // Simulate drag
    await firstWheel.evaluate((el) => {
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
          clientX: centerX + 80,
          clientY: centerY - 40,
          bubbles: true,
        }),
      );
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });

    await expect(draftDisplay).toBeVisible();

    // Click outside the wheel
    await page.click("body", { position: { x: 50, y: 50 } });

    // Draft mode should exit without saving
    await expect(draftDisplay).not.toBeVisible();
    await expect(emoji).toBeVisible();

    // Count should remain unchanged
    const finalCount = await countSpan.textContent();
    expect(finalCount).toBe(initialCount);

    // Thumb should be reset to 12 o'clock
    const wheelAngle = await firstWheel.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--wheel-angle"),
    );
    expect(wheelAngle).toBe("0deg");
  });

  test("wheel increments by 1 per step", async ({ page }) => {
    const firstWheel = page.locator('[data-testid="wheel-wheelA"]');
    const countSpan = page.locator('[data-testid="count-value-wheelA"]');
    const saveBtn = page.locator('[data-testid="save-btn-wheelA"]');

    await expect(countSpan).toHaveText("0");

    // Simulate a small drag (just over one step ~18 degrees)
    await firstWheel.evaluate((el) => {
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
          clientX: centerX + 20,
          clientY: centerY - 45,
          bubbles: true,
        }),
      );
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });

    await saveBtn.click();

    // Count should have increased by 1
    const newCount = await countSpan.textContent();
    expect(newCount).toBe("1");
  });

  test("multiple save sessions accumulate correctly with thumb always at 12 o'clock", async ({
    page,
  }) => {
    const firstWheel = page.locator('[data-testid="wheel-wheelA"]');
    const countSpan = page.locator('[data-testid="count-value-wheelA"]');
    const draftCount = page.locator('[data-testid="draft-count-wheelA"]');
    const saveBtn = page.locator('[data-testid="save-btn-wheelA"]');

    // Session 1
    await firstWheel.evaluate((el) => {
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
          clientX: centerX + 40,
          clientY: centerY - 20,
          bubbles: true,
        }),
      );
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });

    const draftValue1 = await draftCount.textContent();
    const increment1 = parseInt(draftValue1 || "0", 10);
    expect(increment1).toBeGreaterThan(0);

    await saveBtn.click();
    await expect(countSpan).toHaveText(String(increment1));

    // Thumb should be at 12 o'clock
    let wheelAngle = await firstWheel.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--wheel-angle"),
    );
    expect(wheelAngle).toBe("0deg");

    // Session 2
    await firstWheel.evaluate((el) => {
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
          clientX: centerX + 25,
          clientY: centerY - 40,
          bubbles: true,
        }),
      );
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });

    const draftValue2 = await draftCount.textContent();
    const increment2 = parseInt(draftValue2 || "0", 10);
    expect(increment2).toBeGreaterThan(0);

    await saveBtn.click();

    const finalCount = await countSpan.textContent();
    expect(parseInt(finalCount || "0", 10)).toBe(increment1 + increment2);

    wheelAngle = await firstWheel.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--wheel-angle"),
    );
    expect(wheelAngle).toBe("0deg");
  });

  test("both wheels maintain independent counts", async ({ page }) => {
    const firstWheel = page.locator('[data-testid="wheel-wheelA"]');
    const secondWheel = page.locator('[data-testid="wheel-wheelB"]');
    const firstCount = page.locator('[data-testid="count-value-wheelA"]');
    const secondCount = page.locator('[data-testid="count-value-wheelB"]');
    const firstSaveBtn = page.locator('[data-testid="save-btn-wheelA"]');
    const secondSaveBtn = page.locator('[data-testid="save-btn-wheelB"]');

    await expect(firstCount).toHaveText("0");
    await expect(secondCount).toHaveText("0");

    // Add to first wheel only
    await firstWheel.evaluate((el) => {
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
          clientX: centerX + 40,
          clientY: centerY - 20,
          bubbles: true,
        }),
      );
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });

    await firstSaveBtn.click();

    const firstCountValue = await firstCount.textContent();
    expect(parseInt(firstCountValue || "0", 10)).toBeGreaterThan(0);
    await expect(secondCount).toHaveText("0");

    // Add to second wheel
    await secondWheel.evaluate((el) => {
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
          clientX: centerX + 30,
          clientY: centerY - 30,
          bubbles: true,
        }),
      );
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });

    await secondSaveBtn.click();

    const secondCountValue = await secondCount.textContent();
    expect(parseInt(secondCountValue || "0", 10)).toBeGreaterThan(0);
    await expect(firstCount).toHaveText(firstCountValue || "");
  });

  test("count persists after page reload", async ({ page }) => {
    const firstWheel = page.locator('[data-testid="wheel-wheelA"]');
    const countSpan = page.locator('[data-testid="count-value-wheelA"]');
    const saveBtn = page.locator('[data-testid="save-btn-wheelA"]');

    await expect(countSpan).toHaveText("0");

    // Add count via drag and save
    await firstWheel.evaluate((el) => {
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
          clientX: centerX + 60,
          clientY: centerY - 30,
          bubbles: true,
        }),
      );
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });

    await saveBtn.click();

    const countBeforeReload = await countSpan.textContent();
    const countValue = parseInt(countBeforeReload || "0", 10);
    expect(countValue).toBeGreaterThan(0);

    // Reload the page
    await page.reload();

    // Count should persist after reload
    const countAfterReload = await page
      .locator('[data-testid="count-value-wheelA"]')
      .textContent();
    expect(parseInt(countAfterReload || "0", 10)).toBe(countValue);
  });
});
