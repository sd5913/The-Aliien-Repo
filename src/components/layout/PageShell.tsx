// Shared page frame with optional mobile navigation. / 共用页面框架及可选的移动端导航。
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BottomNav } from "./BottomNav";

interface PageShellProps {
  children: ReactNode;
  title?: string;
  showNavigation?: boolean;
  backTo?: string;
}

export function PageShell({ children, title, showNavigation = true, backTo }: PageShellProps) {
  return (
    <div className={`app-shell${showNavigation ? " has-bottom-nav" : ""}`}>
      <header className="topbar">
        {backTo ? <Link className="back-link" to={backTo} aria-label="返回">←</Link> : <span className="brand-mark">b.</span>}
        <Link className="wordmark" to="/">BothPls</Link>
        {title && <span className="topbar-title">{title}</span>}
        <span className="topbar-spacer" />
      </header>
      <main className="page-content">{children}</main>
      {showNavigation && <BottomNav />}
    </div>
  );
}
