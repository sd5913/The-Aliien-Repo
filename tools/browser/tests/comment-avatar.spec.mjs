import { test, expect } from '@playwright/test';
import { mockApp, pollId, optionA } from './fixtures.mjs';

const avatarUrl = 'https://cdn.example.invalid/storage/v1/object/public/poll-images/account/avatar-with-a-long-file-name.jpg';
const brokenUrl = 'https://cdn.example.invalid/missing-avatar.jpg';

for (const width of [320, 390]) {
  for (const closed of [false, true]) {
    test(`owner sees comment avatars without overlap at ${width}px (${closed ? 'closed' : 'open'})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      const state = await mockApp(page, { closed });
      state.comments = [avatarUrl, '🐱', '', brokenUrl].map((avatar, index) => ({
        id: `comment-${index}`, poll_id: pollId, voter_id: `voter-${index}`,
        nickname: '小明', avatar, body: `留言内容 ${index}`, option_id: optionA,
        created_at: `2026-01-01T00:00:0${index}Z`,
      }));
      await page.route(avatarUrl, route => route.fulfill({ contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="purple"/></svg>' }));
      await page.route(brokenUrl, route => route.fulfill({ status: 404, body: '' }));
      await page.goto(`/poll/${pollId}/results`);

      const rows = page.locator('.comment-row');
      await expect(rows).toHaveCount(4);
      const image = rows.nth(0).locator('.comment-avatar img');
      await expect(image).toHaveAttribute('src', avatarUrl);
      await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      await expect(image).toHaveCSS('object-fit', 'cover');
      await expect(rows.nth(0).locator('.comment-avatar')).toHaveText('');
      await expect(rows.nth(1).locator('.comment-avatar')).toHaveText('🐱');
      await expect(rows.nth(2).locator('.comment-avatar')).toHaveText('小');
      await expect(rows.nth(3).locator('.comment-avatar')).toHaveText('🌷');
      await expect(rows.nth(3).locator('.comment-avatar img')).toHaveCount(0);

      for (const row of await rows.all()) {
        await expect(row.getByRole('button', { name: '删除 小明 的留言' })).toBeVisible();
        const avatar = await row.locator('.comment-avatar').boundingBox();
        const copy = await row.locator('.comment-copy').boundingBox();
        expect(avatar.width).toBe(39);
        expect(avatar.height).toBe(39);
        expect(copy.x).toBeGreaterThanOrEqual(avatar.x + avatar.width);
        expect(await row.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      }
    });
  }
}
