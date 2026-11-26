export function accountReturnTo(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return "/";
  const url = new URL(value, "https://bothpls.invalid");
  if (url.pathname.startsWith("//") || ["/auth", "/login"].includes(url.pathname.toLowerCase().replace(/\/+$/, ""))) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}
