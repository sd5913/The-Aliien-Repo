import en from "./messages/en.ts";
import zhHK from "./messages/zh-HK.ts";
import koKR from "./messages/ko-KR.ts";
import type { Locale } from "./locale.ts";

export type MessageKey = keyof typeof en;
export type MessageValues = Readonly<Record<string, string | number>>;
export const catalogs = { en, "zh-HK": zhHK, "ko-KR": koKR } satisfies Record<Locale, Record<MessageKey, string>>;

export function translate(locale: Locale, key: MessageKey, values?: MessageValues): string {
  return catalogs[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = values?.[name];
    return typeof value === "number" ? formatNumber(locale, value) : value ?? placeholder;
  });
}

export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale, options).format(value);
}
