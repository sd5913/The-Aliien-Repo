import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import { PageShell } from "../../../components/layout/PageShell";

type LegalDoc = "terms" | "privacy";
const SECTIONS = [1, 2, 3, 4, 5] as const;

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const { t } = useLocale();
  const title = doc === "terms" ? t("legal.termsTitle") : t("legal.privacyTitle");

  return (
    <PageShell title={title} showHeaderTitle backTo="/auth" showNavigation={false}>
      <section className="legal-page">
        <p className="legal-updated">{t("legal.updatedAt")}</p>
        {SECTIONS.map((n) => (
          <section className="settings-card legal-card" key={n}>
            <h2 className="legal-heading">{t(`legal.${doc}Heading${n}` as MessageKey)}</h2>
            <p className="legal-body">{t(`legal.${doc}Body${n}` as MessageKey)}</p>
          </section>
        ))}
      </section>
    </PageShell>
  );
}
