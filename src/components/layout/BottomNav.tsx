import { useRef } from "react";
import type { TouchEvent } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
// Bottom navigation for the main app sections. / 应用主要区域的底部导航。
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import homeIcon from "../../../images/icon/home.svg";
import plusIcon from "../../../images/icon/plus.svg";
import myIcon from "../../../images/icon/my.svg";

export function BottomNav() {
  const { t } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const suppressClickUntil = useRef(0);

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    touchStartX.current = touch?.clientX ?? null;
    touchStartY.current = touch?.clientY ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const startX = touchStartX.current;
    const startY = touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    const touch = event.changedTouches[0];
    if (startX === null || startY === null || !touch) return;

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    if (Math.abs(deltaX) < 36 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    suppressClickUntil.current = Date.now() + 400;
    if (location.pathname === "/" && deltaX < 0) navigate("/settings");
    else if (location.pathname === "/settings" && deltaX > 0) navigate("/");
  }

  return (
    <nav
      className="bottom-nav"
      aria-label={t("nav.main")}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { touchStartX.current = null; touchStartY.current = null; }}
      onClickCapture={(event) => {
        if (Date.now() < suppressClickUntil.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
        <span className="nav-icon" style={{ maskImage: `url(${homeIcon})`, WebkitMaskImage: `url(${homeIcon})` }} aria-hidden="true" />
        <small>{t("nav.home")}</small>
      </NavLink>
      <NavLink to="/create" aria-label={t("poll.createNav")} title={t("poll.createNav")} className={({ isActive }) => `nav-item nav-create${isActive ? " active" : ""}`}>
        <span className="nav-create-button" aria-hidden="true">
          <span className="nav-icon" style={{ maskImage: `url(${plusIcon})`, WebkitMaskImage: `url(${plusIcon})` }} />
        </span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
        <span className="nav-icon" style={{ maskImage: `url(${myIcon})`, WebkitMaskImage: `url(${myIcon})` }} aria-hidden="true" />
        <small>{t("nav.profile")}</small>
      </NavLink>
    </nav>
  );
}
