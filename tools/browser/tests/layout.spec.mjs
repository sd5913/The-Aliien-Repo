import { test, expect } from '@playwright/test';
import { mockApp, pollId } from './fixtures.mjs';

for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 },
  { width: 430, height: 932 }, { width: 1440, height: 1000 }, { width: 1280, height: 720 }]) {
  test(`phone frame and scroll boundaries at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport); await mockApp(page);
    const width = viewport.width < 600 ? viewport.width : 390;
    const height = viewport.width < 600 ? viewport.height : Math.min(844, viewport.height);
    for (const path of ['/', '/create', '/settings', '/settings/preferences', '/join', `/poll/${pollId}/results`]) {
      await page.goto(path);
      const frame = page.locator('.app-shell, .participant-page');
      await expect(frame).toBeVisible();
      const box = await frame.boundingBox();
      expect(Math.abs(box.width - width)).toBeLessThan(1);
      expect(Math.abs(box.height - height)).toBeLessThan(1);
      expect(Math.abs(box.x - (viewport.width - width)/2)).toBeLessThan(1);
      expect(Math.abs(box.y - (viewport.height - height)/2)).toBeLessThan(1);
      const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
      expect(dimensions.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(dimensions.height).toBeLessThanOrEqual(viewport.height + 1);
      if (path === '/') {
        const nav = page.getByRole('navigation', { name: '主选单' }); const before = await nav.boundingBox();
        await page.locator('.page-content').evaluate((element) => { element.scrollTop = element.scrollHeight; });
        const after = await nav.boundingBox(); expect(after.y).toBeCloseTo(before.y, 1);
        expect(after.y + after.height).toBeLessThanOrEqual(box.y + box.height + 1);
        await page.locator('.page-content').evaluate((element) => { element.scrollTop = 0; });
        await frame.screenshot({ path: info.outputPath('home.png') });
      }
      if (path === '/create') {
        const footer = await page.locator('.create-submit-footer').boundingBox();
        expect(footer.y + footer.height).toBeLessThanOrEqual(box.y + box.height + 1);
      }
      if (path === '/join') {
        await page.getByRole('button', { name: '参与投票' }).scrollIntoViewIfNeeded();
        await expect(page.getByRole('button', { name: '参与投票' })).toBeInViewport();
        await frame.screenshot({ path: info.outputPath('soft-login.png') });
      }
      if (path.endsWith('/results')) {
        await page.getByRole('button', { name: '管理投票', exact: true }).click();
        const dialog = await page.getByRole('dialog', { name: '管理投票', exact: true }).boundingBox();
        expect(dialog.x).toBeGreaterThanOrEqual(box.x); expect(dialog.x + dialog.width).toBeLessThanOrEqual(box.x + box.width + 1);
        expect(dialog.y).toBeGreaterThanOrEqual(box.y); expect(dialog.y + dialog.height).toBeLessThanOrEqual(box.y + box.height + 1);
      }
    }
  });
}
