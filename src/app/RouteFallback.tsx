import { Link } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";
import { useLocale } from "../i18n/LocaleProvider";

export function RouteFallback({ missing = false }: { missing?: boolean }) {
  const { t } = useLocale();
  return (
    <PageShell backTo="/" showNavigation={false}>
      <div className="empty-state">
        <h1>{t(missing ? "app.pageMissing" : "app.routeError")}</h1>
        <p>{t("app.routeHelp")}</p>
        <Link className="purple-button" to="/">{t("common.home")}</Link>
      </div>
    </PageShell>
  );
}
