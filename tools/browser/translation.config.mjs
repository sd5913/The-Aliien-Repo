import base from './playwright.config.mjs';
export default { ...base, testMatch: /machine-translation\.spec\.mjs/,
  use: { ...base.use, baseURL: 'http://127.0.0.1:5187' },
  webServer: { ...base.webServer, command: 'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort',
    url: 'http://127.0.0.1:5187', reuseExistingServer: false,
    env: { ...process.env, VITE_POLL_TRANSLATION_ENABLED: 'true' } } };
