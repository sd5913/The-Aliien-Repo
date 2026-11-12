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
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.1 3.5a8.6 8.6 0 0 0-.1-1.3l1.5-1.2-1.5-2.6-1.9.7a8.7 8.7 0 0 0-2.2-1.3L15.6 4h-3.1l-.3 2.3A8.7 8.7 0 0 0 10 7.6l-1.9-.7-1.5 2.6 1.5 1.2a8.6 8.6 0 0 0 0 2.6l-1.5 1.2 1.5 2.6 1.9-.7a8.7 8.7 0 0 0 2.2 1.3l.3 2.3h3.1l.3-2.3a8.7 8.7 0 0 0 2.2-1.3l1.9.7 1.5-2.6-1.5-1.2a8.6 8.6 0 0 0 .1-1.3Z" /></svg><small>设置</small>
      </NavLink>
    </nav>
  );
}
