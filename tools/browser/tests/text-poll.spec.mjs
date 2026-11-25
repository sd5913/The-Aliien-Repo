import { test, expect } from '@playwright/test';
import { mockApp, pollId, optionB } from './fixtures.mjs';

const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#c4b5fd"/></svg>');

for (const width of [320, 390, 430]) {
  test(`existing text-only poll wraps inside its bottle at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 });
    const state = await mockApp(page);
    const longText = '周末一起去城市里的植物园散步看看花草然后找一家安静的咖啡店坐下来聊聊天';
    state.polls[0].poll_options[0].label = longText;
    state.polls[0].poll_options[0].image_url = null;
    // Historical rows can omit the image property, contain null or an empty URL.
    state.polls[0].poll_options[1].image_url = '';
    await page.goto(`/poll/${pollId}`);
    const text = page.locator('.text-option-content strong');
    await expect(text).toHaveText(longText);
    await expect(page.getByRole('button', { name: '放大图片' })).toHaveCount(0);
    await expect(page.getByText('点击图片放大')).toHaveCount(0);
    const dimensions = await text.evaluate(element => {
      const textRect = element.getBoundingClientRect();
      const body = element.closest('.text-option-bottle-body').getBoundingClientRect();
      const label = element.closest('.text-option-content').getBoundingClientRect();
      return { textWidth: element.scrollWidth, width: element.clientWidth,
        height: textRect.height, lineHeight: parseFloat(getComputedStyle(element).lineHeight),
        inside: textRect.x >= body.x && textRect.right <= body.right && textRect.y >= body.y && textRect.bottom <= body.bottom,
        insideLabel: textRect.x >= label.x && textRect.right <= label.right && textRect.y >= label.y && textRect.bottom <= label.bottom,
        pageOverflow: document.documentElement.scrollWidth > innerWidth };
    });
    expect(dimensions.textWidth).toBeLessThanOrEqual(dimensions.width + 1);
    expect(dimensions.height).toBeGreaterThan(dimensions.lineHeight * 2);
    expect(dimensions.inside).toBe(true);
    expect(dimensions.insideLabel).toBe(true);
    expect(dimensions.pageOverflow).toBe(false);
    await page.locator('.option-carousel').screenshot({ path: info.outputPath('text-bottle.png') });
    await page.getByRole('button', { name: '下一个选项' }).click();
    await expect(text).toHaveText('选项乙');
    await page.getByRole('button', { name: '上一个选项' }).click();
    await expect(text).toHaveText(longText);
    await page.locator('.option-carousel').evaluate(element => {
      const touch = new Touch({ identifier: 1, target: element, clientX: 240, clientY: 200 });
      element.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch] }));
    });
    await page.locator('.option-carousel').evaluate(element => {
      const touch = new Touch({ identifier: 1, target: element, clientX: 80, clientY: 200 });
      element.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [touch] }));
    });
    await expect(text).toHaveText('选项乙');
  });
}

test('text choices keep two-step submission, switching and draft restore', async ({ page }) => {
  const state = await mockApp(page);
  await page.goto(`/poll/${pollId}`);
  await page.getByRole('button', { name: '选择当前选项 A', exact: false }).click();
  expect(state.calls.filter(call => call.name === 'submit_ballot')).toHaveLength(0);
  await page.getByRole('button', { name: '下一个选项' }).click();
  await expect(page.getByRole('button', { name: '提交我的选择' })).toBeDisabled();
  await page.getByRole('button', { name: '选择当前选项 B', exact: false }).click();
  await page.reload();
  await expect(page.locator('.text-option-content strong')).toHaveText('选项乙');
  await expect(page.getByRole('button', { name: '选择当前选项 B', exact: false })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '提交我的选择' }).click();
  await expect(page).toHaveURL(new RegExp(`/poll/${pollId}/results`));
  expect(state.calls.filter(call => call.name === 'submit_ballot')).toHaveLength(1);
  expect(state.calls.find(call => call.name === 'submit_ballot').body.p_ranking).toEqual([optionB]);
});

test('every text bottle uses the poured liquid color and has a surface label', async ({ page }, info) => {
  const state = await mockApp(page);
  const base = state.polls[0].poll_options[0];
  state.polls[0].poll_options = Array.from({ length: 5 }, (_, index) => ({
    ...base, id: `30000000-0000-4000-8000-00000000000${index + 1}`,
    position: index, label: `饮料选项 ${index + 1}`,
  }));
  await page.goto(`/poll/${pollId}`);
  const colors = [];
  for (let index = 0; index < 5; index++) {
    await page.getByRole('button', { name: `查看选项 ${index + 1}` }).click();
    await page.getByRole('button', { name: `选择当前选项 ${String.fromCharCode(65 + index)}`, exact: false }).click();
    const liquid = await page.locator('.text-option-bottle-body').evaluate(element => getComputedStyle(element, '::before').backgroundColor);
    await expect(page.locator('.vote-cup-liquid')).toHaveCSS('fill', liquid);
    colors.push(liquid);
  }
  expect(new Set(colors).size).toBe(5);
  const label = page.locator('.text-option-content');
  await expect(label).toHaveCSS('border-top-style', 'solid');
  const background = await label.evaluate(element => getComputedStyle(element).backgroundColor);
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
  await page.getByRole('button', { name: '查看选项 1' }).click();
  await page.locator('.option-carousel').screenshot({ path: info.outputPath('bottle-label-color.png') });
});

test('unbroken English and explicit newlines remain inside the bottle', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const state = await mockApp(page);
  state.polls[0].poll_options[0].label = 'AReallyLongUnbrokenEnglishOptionThatMustWrapInsideTheBottle';
  state.polls[0].poll_options[1].label = '第一行\n第二行';
  await page.goto(`/poll/${pollId}`);
  const text = page.locator('.text-option-content strong');
  await expect(text).toBeVisible();
  expect(await text.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.getByRole('button', { name: '查看选项 2' }).click();
  await expect(text).toHaveText('第一行\n第二行');
  await expect(text).toHaveCSS('white-space', 'pre-wrap');
});

test('image polls retain images, labels and zoom without bottle styling', async ({ page }) => {
  const state = await mockApp(page);
  for (const option of state.polls[0].poll_options) option.image_url = image;
  await page.goto(`/poll/${pollId}`);
  await expect(page.locator('.carousel-image-wrap > img')).toHaveAttribute('alt', '选项甲');
  await expect(page.locator('.text-option-bottle')).toHaveCount(0);
  await page.getByRole('button', { name: '放大图片' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.lightbox-image img')).toHaveAttribute('src', image);
});

test('mixed options keep the existing image presentation', async ({ page }) => {
  const state = await mockApp(page);
  state.polls[0].poll_options[0].image_url = image;
  await page.goto(`/poll/${pollId}`);
  await expect(page.locator('.carousel-image-wrap > img')).toBeVisible();
  await page.getByRole('button', { name: '下一个选项' }).click();
  await expect(page.locator('.carousel-image-fallback')).toBeVisible();
  await expect(page.locator('.text-option-bottle')).toHaveCount(0);
});
