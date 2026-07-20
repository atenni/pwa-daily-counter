import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  loadFromStorage,
  saveToStorage,
  getCount,
  increment,
  reset,
} from "../src/utils/counter.ts";

// Helper to clear localStorage before each test (node:test runs in Node, not browser, so we need a mock)
beforeEach(() => {
  // @ts-ignore – provide a simple in‑memory mock for localStorage
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
    assert.strictEqual(loadFromStorage(), 123);
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

    it("should handle many wheels independently", () => {
      for (let i = 1; i <= 10; i++) {
        increment(i, `wheel${i}`);
      }

      for (let i = 1; i <= 10; i++) {
        assert.strictEqual(getCount(`wheel${i}`), i);
      }
    });
  });

  describe("edge cases", () => {
    it("should return 0 for invalid stored data", () => {
      (global as any).localStorage.setItem("daily-counter", "not-a-number");
      assert.strictEqual(loadFromStorage(), 0);

      (global as any).localStorage.setItem("daily-counter", "");
      assert.strictEqual(loadFromStorage(), 0);
    });

    it("should handle negative increments (decrement)", () => {
      increment(10);
      increment(-3);
      assert.strictEqual(getCount(), 7);
    });

    it("should handle zero increment", () => {
      increment(5);
      increment(0);
      assert.strictEqual(getCount(), 5);
    });

    it("should handle negative result from decrement", () => {
      increment(-5);
      assert.strictEqual(getCount(), -5);
    });
  });
});
