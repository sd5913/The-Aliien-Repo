import { Capacitor } from "@capacitor/core";
import { parseHttpsOrigin } from "./publicOrigin";

export const isIosApp = Capacitor.getPlatform() === "ios";

const origin = isIosApp
  ? parseHttpsOrigin(import.meta.env.VITE_PUBLIC_APP_ORIGIN)
  : window.location.origin;

if (!origin) throw new Error("The iOS build requires VITE_PUBLIC_APP_ORIGIN.");

export const publicAppOrigin = origin;
