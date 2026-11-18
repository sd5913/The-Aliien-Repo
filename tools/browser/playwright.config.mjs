import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: './tests', workers: 1, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:5180', viewport: { width: 390, height: 844 },
    channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true, screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5180 --strictPort',
    cwd: fileURLToPath(new URL('../../', import.meta.url)), url: 'http://127.0.0.1:5180', reuseExistingServer: true },
});
