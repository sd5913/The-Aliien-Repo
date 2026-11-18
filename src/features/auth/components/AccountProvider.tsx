import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../../lib/supabase/client";
import { PageShell } from "../../../components/layout/PageShell";

const AccountContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });
export const useAccount = () => useContext(AccountContext);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<{ user: User | null; loading: boolean }>({ user: null, loading: true });
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setAccount({ user: user && !user.is_anonymous ? user : null, loading: false });
    });
    return () => subscription.unsubscribe();
  }, []);
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}

export function RequireAccount({ children }: { children: ReactNode }) {
  const { user, loading } = useAccount();
  const location = useLocation();
  if (loading) return <PageShell backTo="/" showNavigation={false}><p className="empty-inline" role="status">正在确认账号登录状态…</p></PageShell>;
  if (!user) return <Navigate replace to={`/auth?returnTo=${encodeURIComponent(location.pathname + location.search + location.hash)}`} />;
  return <>{children}</>;
}
