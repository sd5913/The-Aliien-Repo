import { useLocale } from "./LocaleProvider";
import { isLocale, languageNames } from "./locale";

export function LanguageSelect() {
  const { locale, setLocale, t } = useLocale();
  return (
    <select className="language-select" aria-label={t("app.language")} value={locale} onChange={(event) => {
      if (isLocale(event.target.value)) setLocale(event.target.value);
    }}>
      {Object.entries(languageNames).map(([language, label]) => (
        <option key={language} value={language} lang={language}>{label}</option>
      ))}
    </select>
  );
}
