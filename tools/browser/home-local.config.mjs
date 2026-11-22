import base from './playwright.config.mjs';
export default {
  ...base,
  use: { ...base.use, baseURL: 'http://127.0.0.1:5181' },
  webServer: {
    ...base.webServer,
    command: 'npm run dev -- --host 127.0.0.1 --port 5181 --strictPort',
    url: 'http://127.0.0.1:5181',
    reuseExistingServer: false,
  },
};
