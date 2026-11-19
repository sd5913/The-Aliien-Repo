import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { formatNumber, translate, type MessageKey, type MessageValues } from "./catalog";
import { localeStorageKey, readLocale, type Locale } from "./locale";

function createLocalization(locale: Locale) {
  const plurals = new Intl.PluralRules(locale);
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const t = (key: MessageKey, values?: MessageValues) => translate(locale, key, values);
  return {
    locale,
    t,
    number: (value: number) => formatNumber(locale, value),
    percent: (ratio: number) => percent.format(ratio),
    votes: (count: number) => t(plurals.select(count) === "one" ? "poll.countOne" : "poll.count", { count }),
    participants: (count: number) => t(plurals.select(count) === "one" ? "vote.person" : "vote.people", { count }),
  };
}

type Localization = ReturnType<typeof createLocalization> & { setLocale: (locale: Locale) => void };
const LocaleContext = createContext<Localization | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState(readLocale);
  const localization = useMemo(() => ({ ...createLocalization(locale), setLocale }), [locale]);

  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.title = localization.t("app.title");
    document.querySelector('meta[name="description"]')?.setAttribute("content", localization.t("app.description"));
    try {
      window.localStorage.setItem(localeStorageKey, locale);
    } catch {
      // The current language remains selected until the page is reloaded.
    }
  }, [locale, localization]);

  return <LocaleContext.Provider value={localization}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const localization = useContext(LocaleContext);
  if (!localization) throw new Error("Missing LocaleProvider");
  return localization;
}
