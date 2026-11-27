import { test, expect } from '@playwright/test';
import { mockApp } from './fixtures.mjs';

async function setup(page, mode = 'login') {
  await mockApp(page, { accountId: null });
  const requests = [];
  await page.route('**/auth/v1/otp**', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: {} });
  });
  await page.route('**/auth/v1/recover**', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: {} });
  });
  await page.goto(`/auth?mode=${mode}`);
  if (mode === 'register') await page.locator('#auth-nickname').fill('测试昵称');
  return requests;
}

for (const mode of ['login', 'register', 'reset']) {
  test(`${mode} rejects malformed emails before making requests`, async ({ page }) => {
    const requests = await setup(page, mode);
    const email = page.locator('#auth-email');
    const send = page.locator('.auth-submit');
    await send.click();
    await expect(page.getByRole('alert')).toHaveText('请填写邮箱地址。');
    for (const value of ['missing-at.example.com', 'name@localhost', 'name@domain..com', '.name@example.com', 'name@-domain.com']) {
      await email.fill(value);
      await send.click();
      await expect(page.getByRole('alert')).toContainText('请输入有效的邮箱地址');
      await expect(email).toHaveAttribute('aria-invalid', 'true');
    }
    expect(requests).toHaveLength(0);
    await email.fill('friend+tag@sub.example.com');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(email).not.toHaveAttribute('aria-invalid', 'true');
    await send.click();
    await expect(page.getByRole('status')).toContainText('垃圾邮件文件夹');
    expect(requests).toHaveLength(1);
    expect(requests[0].email).toBe('friend+tag@sub.example.com');
  });
}

test('resending and changing email retain the spam reminder and validate the new address', async ({ page }) => {
  const requests = await setup(page);
  await page.locator('#auth-email').fill('friend@example.com');
  await page.locator('.auth-submit').click();
  await expect(page.locator('#auth-email-code')).toBeVisible();
  await expect(page.locator('#auth-email-hint')).toContainText('垃圾邮件文件夹');
  await page.getByRole('button', { name: '重新发送验证码' }).click();
  await expect.poll(() => requests.length).toBe(2);
  await expect(page.getByRole('status')).toContainText('垃圾邮件文件夹');
  await page.getByRole('button', { name: '更换邮箱' }).click();
  await page.locator('#auth-email').fill('friend@invalid');
  await page.locator('.auth-submit').click();
  await expect(page.getByRole('alert')).toContainText('有效的邮箱地址');
  expect(requests).toHaveLength(2);
});

test('server email rejection uses the inline email error', async ({ page }) => {
  await setup(page);
  await page.route('**/auth/v1/otp**', route => route.fulfill({ status: 422, json: {
    code: 'email_address_invalid', msg: 'Email address is invalid',
  } }));
  await page.locator('#auth-email').fill('friend@example.com');
  await page.locator('.auth-submit').click();
  await expect(page.locator('#auth-email-error')).toContainText('有效的邮箱地址');
  await expect(page.locator('#auth-email-code')).toHaveCount(0);
});

for (const [locale, reminder, invalid] of [
  ['zh-CN', '垃圾邮件文件夹', '有效的邮箱地址'],
  ['en-US', 'spam or junk folder', 'valid email address'],
  ['ko-KR', '스팸 메일함', '올바른 이메일 주소'],
]) {
  test(`email hints and validation fit a 320px screen in ${locale}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.addInitScript(locale => localStorage.setItem('bothpls:locale', locale), locale);
    await setup(page);
    await expect(page.locator('#auth-email-hint')).toContainText(reminder);
    await page.locator('#auth-email').fill('friend@invalid');
    await page.locator('.auth-submit').click();
    await expect(page.getByRole('alert')).toContainText(invalid);
    expect(await page.locator('.auth-form').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('auth-email-hints.png') });
  });
}
