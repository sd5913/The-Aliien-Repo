export function pollReturnTo(location: { search: string; state?: unknown }): "/" | "/settings" {
  const state = location.state as { returnTo?: unknown } | null;
  const value = state?.returnTo ?? new URLSearchParams(location.search).get("returnTo");
  return value === "/settings" ? "/settings" : "/";
}

export function pollPath(id: string, page: "vote" | "results" | "join", returnTo: string) {
  return `/poll/${encodeURIComponent(id)}${page === "vote" ? "" : `/${page}`}?returnTo=${encodeURIComponent(returnTo === "/settings" ? "/settings" : "/")}`;
}
