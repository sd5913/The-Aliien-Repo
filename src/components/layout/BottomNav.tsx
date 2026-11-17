// Bottom navigation for the main app sections. / 应用主要区域的底部导航。
import { AppIcon } from "../ui/AppIcon";
import { NavLink } from "react-router-dom";

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
        <AppIcon name="home" size={25} /><small>首页</small>
      </NavLink>
      <NavLink to="/create" aria-label="发起投票" title="发起投票" className={({ isActive }) => `nav-item nav-create${isActive ? " active" : ""}`}>
        <AppIcon name="plusCircle" size={48} />
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
        <AppIcon name="my" size={25} /><small>个人</small>
      </NavLink>
    </nav>
  );
}
