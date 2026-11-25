import { test, expect } from '@playwright/test';
import { mockApp } from './fixtures.mjs';

for (const width of [320, 390, 430]) {
  test(`text previews in recent, square and personal cards at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 });
    const state = await mockApp(page);
    const base = state.polls[0].poll_options[0];
    const names = ['周末去植物园散步然后一起喝咖啡', '在家看电影', '第三个选项不应预览', '第四个选项', '第五个选项'];
    state.polls[0].poll_options = names.map((label, index) => ({
      ...base, id: `30000000-0000-4000-8000-00000000000${index + 1}`, position: index, label,
      image_url: index % 2 ? '' : null,
    }));
    for (const path of ['/', '/?square', '/settings']) {
      await page.goto(path);
      if (path === '/?square') await page.getByRole('tab', { name: '广场', exact: true }).click();
      const groups = page.getByRole('group', { name: '选项预览' });
      await expect(groups).toHaveCount(1);
      for (const group of await groups.all()) {
        await expect(group.getByRole('img')).toHaveCount(2);
        await expect(group.getByRole('img', { name: `选项 A：${names[0]}`, exact: true })).toBeVisible();
        await expect(group.getByRole('img', { name: `选项 B：${names[1]}`, exact: true })).toBeVisible();
        await expect(group.locator('img')).toHaveCount(0);
        await expect(group.getByText(names[2])).toHaveCount(0);
        const sizes = await group.evaluate(element => {
          const groupRect = element.getBoundingClientRect();
          const copy = element.nextElementSibling.getBoundingClientRect();
          return [...element.children].map(child => {
            const rect = child.getBoundingClientRect();
            return { ratio: rect.width / rect.height, right: rect.right, groupRight: groupRect.right, copyLeft: copy.x };
          });
        });
        for (const size of sizes) {
          expect(size.ratio).toBeCloseTo(2 / 3, 2);
          expect(size.right).toBeLessThanOrEqual(size.groupRight + 1);
          expect(size.right).toBeLessThanOrEqual(size.copyLeft + 1);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (path === '/?square') {
        await expect(page.locator('.home-square').getByRole('button', { name: '分享投票' })).toHaveCount(1);
        await page.locator('.home-square .my-poll-card').screenshot({ path: info.outputPath('text-card.png') });
      }
    }
  });
}

test('image and mixed cards retain image previews', async ({ page }) => {
  const state = await mockApp(page);
  const image = 'https://images.example.test/option-a.png';
  state.polls[0].poll_options[0].image_url = image;
  for (const path of ['/', '/settings']) {
    await page.goto(path);
    const thumbnails = page.locator('.my-poll-thumbnails').first();
    await expect(thumbnails.locator('img')).toHaveCount(2);
    await expect(thumbnails.locator('img').first()).toHaveAttribute('src', image);
    await expect(page.locator('.poll-preview-bottle')).toHaveCount(0);
  }
});
