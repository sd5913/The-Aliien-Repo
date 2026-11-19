// Vite development and production build configuration. / Vite 开发与生产构建配置。
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { parseHttpsOrigin } from "./src/lib/publicOrigin";

export default defineConfig(({ mode }) => {
  if (mode === "ios" && !parseHttpsOrigin(loadEnv(mode, process.cwd()).VITE_PUBLIC_APP_ORIGIN)) {
    throw new Error("VITE_PUBLIC_APP_ORIGIN must be the HTTPS origin of the BothPls website.");
  }
  return {
    plugins: [react()],
    build: { outDir: mode === "ios" ? "dist-ios" : "dist" },
  };
});
