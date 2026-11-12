// Shared page frame with optional mobile navigation. / 共用页面框架及可选的移动端导航。
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BottomNav } from "./BottomNav";

interface PageShellProps {
  children: ReactNode;
  title?: string;
  showNavigation?: boolean;
  backTo?: string;
  showHeaderTitle?: boolean;
  footer?: ReactNode;
  headerAction?: ReactNode;
}

export function PageShell({ children, title, showNavigation = true, backTo, showHeaderTitle = false, footer, headerAction }: PageShellProps) {
  return (
    <div className={`app-shell${showNavigation ? " has-bottom-nav" : ""}`}>
      <header className="topbar">
        {backTo && <Link className="back-link" to={backTo} aria-label="返回">←</Link>}
        {showHeaderTitle && title ? (
          <h1 className="page-header-title">{title}</h1>
        ) : (
          <>
            {!backTo && <Link className="brand-bubbles" to="/" aria-label="BothPls 首页"><span /><span /></Link>}
            <Link className="brand-copy" to="/"><strong>BothPls</strong></Link>
            {title && !backTo && <span className="topbar-title">{title}</span>}
          </>
        )}
        <span className="topbar-spacer" />
        {headerAction}
      </header>
      <main className="page-content">{children}</main>
      {footer}
      {showNavigation && <BottomNav />}
    </div>
  );
}
