#!/usr/bin/env node
(async () => {
  const { chromium } = await import('playwright');
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  const email = process.env.PJ_TEST_EMAIL;
  const password = process.env.PJ_TEST_PASSWORD;
  if (!email || !password) {
    console.error('Set PJ_TEST_EMAIL and PJ_TEST_PASSWORD');
    process.exit(2);
  }
  // Try signup first
  try {
    const res = await fetch(`${baseURL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName: 'Playwright User' })
    });
    if (!res.ok && res.status !== 409) {
      const t = await res.text();
      console.warn(`Signup failed: ${res.status} ${t}`);
    }
  } catch (e) {
    console.warn(`Signup error (continuing): ${e.message}`);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(`${baseURL}/login`);
    await page.fill('#email', email);
    await page.fill('#password', password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForURL('**/rooms', { timeout: 15000 })
    ]);
    console.log('Login OK ->', page.url());
  } catch (e) {
    console.error('Login failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();