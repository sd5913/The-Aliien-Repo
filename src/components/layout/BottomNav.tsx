// Bottom navigation for the main app sections. / 应用主要区域的底部导航。
import { NavLink } from "react-router-dom";

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
        <span aria-hidden="true">⌂</span><small>首页</small>
      </NavLink>
      <NavLink to="/polls/new" className={({ isActive }) => `nav-item nav-create${isActive ? " active" : ""}`}>
        <span aria-hidden="true">＋</span><small>创建</small>
      </NavLink>
      <NavLink to="/polls" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
        <span aria-hidden="true">▤</span><small>我的投票</small>
      </NavLink>
    </nav>
  );
}
