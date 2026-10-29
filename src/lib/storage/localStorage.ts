export const POLLS_STORAGE_KEY = "bothpls:polls:v1";
export const VOTER_STORAGE_KEY = "bothpls:voter:v1";

export function readLocalJson<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;

    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed)) {
      console.error(`BothPls: stored data for "${key}" has an invalid shape.`);
      return fallback;
    }
    return parsed;
  } catch (error) {
    console.error(`BothPls: could not read local data for "${key}".`, error);
    return fallback;
  }
}

export function writeLocalJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`BothPls: could not save local data for "${key}".`, error);
    throw error;
  }
}
