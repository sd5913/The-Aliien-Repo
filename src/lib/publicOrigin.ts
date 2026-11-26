export function parseHttpsOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.href === url.origin + "/"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}
