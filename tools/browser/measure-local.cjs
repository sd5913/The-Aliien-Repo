const { chromium } = require('playwright');
const targetUrl = process.argv[2] ?? 'http://127.0.0.1:5180/';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined });
  try {
    for (let run = 1; run <= 3; run++) {
      const page = await browser.newPage();
      const responses = [];
      const pending = [];
      const transfer = new Map();
      const session = await page.context().newCDPSession(page);
      await session.send('Network.enable');
      session.on('Network.requestWillBeSent', ({ requestId, request }) => {
        if (request.url.includes('.supabase.co/rest/v1/')) transfer.set(requestId, 0);
      });
      session.on('Network.loadingFinished', ({ requestId, encodedDataLength }) => {
        if (transfer.has(requestId)) transfer.set(requestId, encodedDataLength);
      });
      page.on('response', (response) => {
        if (!response.url().includes('.supabase.co/rest/v1/')) return;
        const entry = { path: new URL(response.url()).pathname, status: response.status(), bytes: 0, ms: 0 };
        responses.push(entry);
        pending.push((async () => {
          try {
            const [body, timing] = await Promise.all([response.body(), response.request().timing()]);
            entry.bytes = body.length;
            entry.ms = Math.round(timing.responseEnd);
          } catch (error) {
            entry.error = error.message;
          }
        })());
      });
      const start = Date.now();
      let outcome = 'loaded';
      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
        await page.locator('.home-recent .poll-card-list, .home-recent .empty-state, .home-recent [role="alert"]').first().waitFor({ timeout: 20000 });
        if (await page.locator('.home-recent [role="alert"]').count()) outcome = 'error';
      } catch (error) {
        outcome = `timeout: ${error.message.split('\n')[0]}`;
      }
      await Promise.allSettled(pending);
      console.log(JSON.stringify({ run, readyMs: Date.now() - start, outcome,
        cards: await page.locator('.home-recent .poll-card').count(), requests: responses.length,
        bodyBytes: responses.reduce((total, response) => total + response.bytes, 0),
        transferBytes: [...transfer.values()].reduce((total, bytes) => total + bytes, 0), responses }));
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
