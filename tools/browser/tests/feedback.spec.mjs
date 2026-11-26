import { test, expect } from '@playwright/test';
import { mockApp, owner } from './fixtures.mjs';

const png = { name: 'bug.png', mimeType: 'image/png',
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') };
const submitButton = page => page.getByRole('button', { name: '提交反馈', exact: true });
async function setup(page, options = {}) {
  const state = await mockApp(page, options);
  state.feedback = [];
  state.fail = false;
  await page.route('**/rest/v1/user_feedback', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers().prefer ?? '').not.toContain('return=representation');
    if (state.fail) return route.fulfill({ status: 400, contentType: 'application/json',
      body: JSON.stringify({ message: 'Storage unavailable' }) });
    state.feedback.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, body: '' });
  });
  return state;
}
async function fill(page) {
  await page.getByLabel('问题页面', { exact: true }).fill('  投票结果页  ');
  await page.getByLabel('标题', { exact: true }).fill('  留言头像显示错误  ');
  await page.getByLabel('问题描述', { exact: true }).fill('  上传的头像显示成链接，挡住了留言。  ');
}

for (const accountId of [null, owner]) {
  test(`${accountId ? 'account' : 'guest'} can submit from settings with no contact or screenshot`, async ({ page }) => {
    const state = await setup(page, { accountId });
    await page.goto('/settings/preferences');
    await page.getByRole('link', { name: '问题反馈' }).click();
    await expect(page).toHaveURL(/\/settings\/feedback$/);
    await submitButton(page).click();
    expect(state.feedback).toHaveLength(0);
    await fill(page);
    await submitButton(page).click();
    await expect(page.getByRole('heading', { name: '反馈已提交' })).toBeFocused();
    expect(state.feedback).toHaveLength(1);
    expect(state.feedback[0]).toMatchObject({ page: '投票结果页', title: '留言头像显示错误',
      body: '上传的头像显示成链接，挡住了留言。', contact: null, screenshot_path: null, locale: 'zh-CN' });
    expect(state.calls.filter(call => call.name === 'image_upload')).toHaveLength(0);
    await page.getByRole('link', { name: '返回设置' }).click();
    await expect(page).toHaveURL(/\/settings\/preferences$/);
  });
}

test('screenshot and contact survive insert failure; retry reuses the private upload', async ({ page }) => {
  const state = await setup(page, { accountId: null });
  await page.goto('/settings/feedback');
  await fill(page);
  await page.getByLabel('联系方式', { exact: false }).fill('  hello@example.invalid  ');
  await page.locator('#feedback-screenshot').setInputFiles(png);
  await expect(page.getByAltText('问题截图预览')).toBeVisible();
  state.fail = true;
  await submitButton(page).click();
  await expect(page.getByRole('alert')).toContainText('提交失败');
  await expect(page.getByLabel('标题', { exact: true })).toHaveValue('  留言头像显示错误  ');
  await expect(page.getByAltText('问题截图预览')).toBeVisible();
  state.fail = false;
  await submitButton(page).click();
  await expect(page.getByRole('heading', { name: '反馈已提交' })).toBeVisible();
  expect(state.feedback).toHaveLength(1);
  expect(state.feedback[0].contact).toBe('hello@example.invalid');
  expect(state.feedback[0].screenshot_path).toMatch(/^[0-9a-f-]{36}\/screenshot\.png$/);
  const uploads = state.calls.filter(call => call.name === 'image_upload');
  expect(uploads).toHaveLength(1);
  expect(uploads[0].path).toBe('/storage/v1/object/feedback-screenshots/' + state.feedback[0].screenshot_path);
});

test('failed screenshot upload can be retried without losing the report', async ({ page }) => {
  const state = await setup(page);
  let fail = true;
  await page.route('**/storage/v1/object/feedback-screenshots/**', async route => {
    if (!fail) return route.fallback();
    return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'upload failed' }) });
  });
  await page.goto('/settings/feedback');
  await fill(page);
  await page.locator('#feedback-screenshot').setInputFiles(png);
  await submitButton(page).click();
  await expect(page.getByRole('alert')).toContainText('提交失败');
  expect(state.feedback).toHaveLength(0);
  await expect(page.getByAltText('问题截图预览')).toBeVisible();
  fail = false;
  await submitButton(page).click();
  await expect(page.getByRole('heading', { name: '反馈已提交' })).toBeVisible();
  expect(state.feedback).toHaveLength(1);
});

test('validates whitespace, image format and size; a screenshot can be removed', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/settings/feedback');
  await fill(page);
  await page.getByLabel('标题', { exact: true }).fill('   ');
  await submitButton(page).click();
  await expect(page.getByRole('alert')).toContainText('请填写');
  expect(state.feedback).toHaveLength(0);
  await fill(page);
  await page.locator('#feedback-screenshot').setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
  await expect(page.getByRole('alert')).toContainText('请选择 JPG');
  await page.locator('#feedback-screenshot').setInputFiles({ ...png, buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  await expect(page.getByRole('alert')).toContainText('不能超过 5 MB');
  await page.locator('#feedback-screenshot').setInputFiles(png);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: '移除截图' }).click();
  await expect(page.getByAltText('问题截图预览')).toHaveCount(0);
  await submitButton(page).click();
  await expect(page.getByRole('heading', { name: '反馈已提交' })).toBeVisible();
  expect(state.feedback[0].screenshot_path).toBe(null);
  expect(state.calls.filter(call => call.name === 'image_upload')).toHaveLength(0);
});

test('disables the form and prevents duplicate requests while submitting', async ({ page }) => {
  await setup(page);
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  let requests = 0;
  await page.route('**/rest/v1/user_feedback', async route => {
    requests++;
    await pending;
    return route.fulfill({ status: 201, body: '' });
  });
  await page.goto('/settings/feedback');
  await fill(page);
  try {
    await submitButton(page).click();
    await expect(page.getByRole('button', { name: '正在提交…' })).toBeDisabled();
    await expect(page.getByLabel('标题', { exact: true })).toBeDisabled();
    await page.locator('form').evaluate(form => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(requests).toBe(1);
  } finally { release(); }
  await expect(page.getByRole('heading', { name: '反馈已提交' })).toBeVisible();
});

for (const width of [320, 390]) {
  for (const [locale, heading] of [['zh-CN', '问题反馈'], ['en-US', 'Report a problem'], ['ko-KR', '문제 신고']]) {
    test(`feedback layout at ${width}px in ${locale}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await setup(page, { accountId: null });
      await page.addInitScript(locale => localStorage.setItem('bothpls:locale', locale), locale);
      await page.goto('/settings/feedback');
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      expect(await page.locator('.page-content').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('feedback-top.png') });
      const button = page.locator('.feedback-submit');
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeVisible();
      expect(await page.locator('.page-content').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('feedback-bottom.png') });
      await page.getByRole('link', { name: locale === 'zh-CN' ? '返回' : locale === 'en-US' ? 'Back' : '뒤로' }).click();
      await expect(page).toHaveURL(/\/settings\/preferences$/);
    });
  }
}
