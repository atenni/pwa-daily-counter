import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  saveToStorage,
  getCount,
  increment,
  reset,
  checkDailyReset,
} from "../src/utils/counter.ts";

// Helper to create a date string offset by days from today (YYYY-MM-DD format)
function getDateString(offsetDays: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString("en-CA");
}

// Helper to clear localStorage before each test (node:test runs in Node, not browser, so we need a mock)
beforeEach(() => {
  // @ts-ignore – provide a simple Map-based mock for localStorage
  (global as any).localStorage = {
    store: new Map<string, string>(),
    getItem(key: string) {
      return this.store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      this.store.set(key, value);
    },
    removeItem(key: string) {
      this.store.delete(key);
    },
    clear() {
      this.store.clear();
    },
  };
});

describe("counter utility", () => {
  it("should start at 0 when storage is empty", () => {
    assert.strictEqual(getCount(), 0);
  });

  it("should increment by specified amount and persist", () => {
    increment(1);
    assert.strictEqual(getCount(), 1);
    increment(5);
    assert.strictEqual(getCount(), 6);
  });

  it("should reset to 0", () => {
    increment(10);
    assert.strictEqual(getCount(), 10);
    reset();
    assert.strictEqual(getCount(), 0);
  });

  it("should save and load correctly", () => {
    saveToStorage(123);
    assert.strictEqual(getCount(), 123);
  });

  describe("wheel ID isolation", () => {
    it("should maintain independent counts for different wheel IDs", () => {
      increment(5, "wheelA");
      increment(3, "wheelB");

      assert.strictEqual(getCount("wheelA"), 5);
      assert.strictEqual(getCount("wheelB"), 3);
      assert.strictEqual(getCount(), 0); // default wheel unchanged
    });

    it("should reset wheels independently", () => {
      increment(10, "wheelA");
      increment(10, "wheelB");
      reset("wheelA");

      assert.strictEqual(getCount("wheelA"), 0);
      assert.strictEqual(getCount("wheelB"), 10);
    });

    it("should handle multiple wheels independently", () => {
      // Test with 3 wheels - sufficient to verify isolation logic
      increment(1, "wheel1");
      increment(2, "wheel2");
      increment(3, "wheel3");

      assert.strictEqual(getCount("wheel1"), 1);
      assert.strictEqual(getCount("wheel2"), 2);
      assert.strictEqual(getCount("wheel3"), 3);
    });
  });

  describe("edge cases", () => {
    it("should return 0 for non-numeric stored data", () => {
      (global as any).localStorage.setItem("daily-counter", "not-a-number");
      assert.strictEqual(getCount(), 0);
    });

    it("should return 0 for empty stored data", () => {
      (global as any).localStorage.setItem("daily-counter", "");
      assert.strictEqual(getCount(), 0);
    });

    it("should handle negative increments (decrement)", () => {
      increment(10);
      increment(-3);
      assert.strictEqual(getCount(), 7);
    });

    it("should handle negative result from decrement", () => {
      increment(-5);
      assert.strictEqual(getCount(), -5);
    });

    it("should use default increment of 20 when step not specified", () => {
      increment();
      assert.strictEqual(getCount(), 20);
    });
  });

  describe("daily reset", () => {
    it("should reset all wheels on first open of a new day", () => {
      increment(10, "wheelA");
      increment(20, "wheelB");
      assert.strictEqual(getCount("wheelA"), 10);
      assert.strictEqual(getCount("wheelB"), 20);

      // Simulate last reset was yesterday
      (global as any).localStorage.setItem(
        "daily-counter-last-reset",
        getDateString(-1),
      );

      checkDailyReset(["wheelA", "wheelB"]);

      assert.strictEqual(getCount("wheelA"), 0);
      assert.strictEqual(getCount("wheelB"), 0);
    });

    it("should not reset wheels if already reset today", () => {
      increment(10, "wheelA");
      increment(20, "wheelB");
      assert.strictEqual(getCount("wheelA"), 10);
      assert.strictEqual(getCount("wheelB"), 20);

      // Simulate last reset was today
      (global as any).localStorage.setItem(
        "daily-counter-last-reset",
        getDateString(0),
      );

      checkDailyReset(["wheelA", "wheelB"]);

      assert.strictEqual(getCount("wheelA"), 10);
      assert.strictEqual(getCount("wheelB"), 20);
    });

    it("should update last reset date after resetting", () => {
      increment(5, "wheelA");
      (global as any).localStorage.setItem(
        "daily-counter-last-reset",
        getDateString(-1),
      );

      checkDailyReset(["wheelA"]);

      const lastReset = (global as any).localStorage.getItem(
        "daily-counter-last-reset",
      );
      assert.strictEqual(lastReset, getDateString(0));
    });

    it("should handle empty wheelIds array", () => {
      increment(5, "wheelA");
      (global as any).localStorage.setItem(
        "daily-counter-last-reset",
        getDateString(-1),
      );

      // Should not throw
      checkDailyReset([]);

      // Wheel should remain unchanged
      assert.strictEqual(getCount("wheelA"), 5);
    });
  });

  describe("saveToStorage with wheel ID", () => {
    it("should save to storage with wheel ID parameter", () => {
      saveToStorage(42, "wheelA");
      assert.strictEqual(getCount("wheelA"), 42);
    });
  });
});
