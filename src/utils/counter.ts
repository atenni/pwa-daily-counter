/**
 * Counter utility for the Daily Counter PWA.
 * Stores the current count in localStorage under the key "daily-counter".
 * Provides functions to get, increment, reset, and automatically reset at midnight.
 */

// Base key for the default counter (kept for backward compatibility)
const STORAGE_KEY = "daily-counter";

/** Helper to build a storage key for a specific wheel */
function keyFor(id: string): string {
  return `${STORAGE_KEY}-${id}`;
}

/** Get the current count from localStorage. Returns 0 if not present or invalid. */
export function getCount(id?: string): number {
  const key = id ? `${STORAGE_KEY}-${id}` : STORAGE_KEY;
  const raw = localStorage.getItem(key);
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Save the current count to localStorage. */
export function saveToStorage(count: number, id?: string): void {
  const key = id ? `${STORAGE_KEY}-${id}` : STORAGE_KEY;
  localStorage.setItem(key, String(count));
}

/** Increment the count by the given step and persist it. */
export function increment(step: number = 20, id?: string): void {
  const current = getCount(id);
  saveToStorage(current + step, id);
}

/** Reset the count to zero and persist. */
export function reset(id?: string): void {
  saveToStorage(0, id);
}

/**
 * Set up an automatic midnight reset.
 * Checks every minute whether the date has changed since the last check.
 */
export function startMidnightReset(): void {
  let lastDate = new Date().getDate();
  setInterval(() => {
    const now = new Date();
    const today = now.getDate();
    if (today !== lastDate) {
      // Day changed – reset counter
      reset();
      lastDate = today;
    }
  }, 60_000); // check every minute
}
