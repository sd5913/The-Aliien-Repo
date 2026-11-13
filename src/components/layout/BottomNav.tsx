// Bottom navigation for the main app sections. / 应用主要区域的底部导航。
import { NavLink } from "react-router-dom";

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg><small>首页</small>
      </NavLink>
      <NavLink to="/create" aria-label="发起投票" title="发起投票" className={({ isActive }) => `nav-item nav-create${isActive ? " active" : ""}`}>
        <span aria-hidden="true">＋</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg><small>个人</small>
      </NavLink>
    </nav>
  );
}
