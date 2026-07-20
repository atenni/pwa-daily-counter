import { describe, it, expect, beforeEach } from "node:test";
import {
  loadFromStorage,
  saveToStorage,
  getCount,
  increment,
  reset,
} from "../src/utils/counter.js";

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
    expect(getCount()).toBe(0);
  });

  it("should increment by step and persist", () => {
    increment(20);
    expect(getCount()).toBe(20);
    increment(20);
    expect(getCount()).toBe(40);
  });

  it("should reset to 0", () => {
    increment(20);
    reset();
    expect(getCount()).toBe(0);
  });

  it("should save and load correctly", () => {
    saveToStorage(123);
    expect(loadFromStorage()).toBe(123);
  });
});
