import { useLocale } from "../../i18n/LocaleProvider";
// Bottom navigation for the main app sections. / 应用主要区域的底部导航。
import { AppIcon } from "../ui/AppIcon";
import { NavLink } from "react-router-dom";

export function BottomNav() {
  const { t } = useLocale();
  return (
    <nav className="bottom-nav" aria-label={t("nav.main")}>
      <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
        <AppIcon name="home" size={25} /><small>{t("nav.home")}</small>
      </NavLink>
      <NavLink to="/create" aria-label={t("poll.createNav")} title={t("poll.createNav")} className={({ isActive }) => `nav-item nav-create${isActive ? " active" : ""}`}>
        <AppIcon name="plusCircle" size={48} />
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
        <AppIcon name="my" size={25} /><small>{t("nav.profile")}</small>
      </NavLink>
    </nav>
  );
}
