import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export const nativePollSharing = registerPlugin<{
  detectLink(): Promise<{ hasLink: boolean; revision: number }>;
  readLink(options: { revision: number }): Promise<{ value?: string; changed?: boolean }>;
  share(item: { url: string } | { png: string }): Promise<void>;
  addListener(event: "foreground", listener: () => void): Promise<PluginListenerHandle>;
}>("PollSharing");

export function pastedPollPath(value: string | undefined, publicOrigin: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.origin !== publicOrigin || url.protocol !== "https:" || url.username || url.password) return null;
    const match = /^\/poll\/([\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12})\/?$/i.exec(url.pathname);
    return match ? `/poll/${match[1].toLowerCase()}` : null;
  } catch {
    return null;
  }
}
