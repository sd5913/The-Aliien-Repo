export const languageNames = {
  "zh-HK": "繁體中文（香港）",
  en: "English",
  "ko-KR": "한국어",
} as const;

export type Locale = keyof typeof languageNames;
export const defaultLocale: Locale = "zh-HK";
export const localeStorageKey = "bothpls:locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(languageNames, value);
}

export function readLocale(): Locale {
  try {
    const value = window.localStorage.getItem(localeStorageKey);
    if (isLocale(value)) return value;
  } catch {
    // The switch still works for this session if browser storage is unavailable.
  }
  return defaultLocale;
}
