/**
 * Counter utility for the Daily Counter PWA.
 * Stores the current count in localStorage under the key "daily-counter".
 * Provides functions to get, increment, reset, and automatically reset at midnight.
 */

// Base key for wheel counters
const STORAGE_KEY = "daily-counter";

/** Get the current count from localStorage. Returns 0 if not present, invalid, or on error. */
export function getCount(id?: string): number {
  try {
    const key = id ? `${STORAGE_KEY}-${id}` : STORAGE_KEY;
    const raw = localStorage.getItem(key);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

/** Save the current count to localStorage. */
export function saveToStorage(count: number, id?: string): void {
  try {
    const key = id ? `${STORAGE_KEY}-${id}` : STORAGE_KEY;
    localStorage.setItem(key, String(count));
  } catch {
    // Silently fail if localStorage is unavailable (private browsing, quota exceeded)
  }
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

const LAST_RESET_KEY = "daily-counter-last-reset";

/**
 * Get today's date in YYYY-MM-DD format (local time, not UTC).
 */
function getTodayString(): string {
  return new Date().toLocaleDateString("en-CA");
}

/**
 * Check if this is the first open of a new day and reset counts if so.
 * Should be called on app initialization.
 * @param wheelIds - Array of wheel IDs to reset (e.g., ["wheelA", "wheelB"])
 */
export function checkDailyReset(wheelIds: string[]): void {
  try {
    const today = getTodayString();
    const lastReset = localStorage.getItem(LAST_RESET_KEY);

    if (lastReset !== today) {
      wheelIds.forEach((id) => reset(id));
      localStorage.setItem(LAST_RESET_KEY, today);
    }
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
