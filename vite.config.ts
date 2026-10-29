// Vite development and production build configuration. / Vite 开发与生产构建配置。
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
