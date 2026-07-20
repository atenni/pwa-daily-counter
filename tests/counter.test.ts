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

  it("should increment by step and persist", () => {
    increment(20);
    assert.strictEqual(getCount(), 20);
    increment(20);
    assert.strictEqual(getCount(), 40);
  });

  it("should reset to 0", () => {
    increment(20);
    reset();
    assert.strictEqual(getCount(), 0);
  });

  it("should save and load correctly", () => {
    saveToStorage(123);
    assert.strictEqual(loadFromStorage(), 123);
  });
});
