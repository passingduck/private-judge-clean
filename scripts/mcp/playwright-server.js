#!/usr/bin/env node
const { createServer } = require('./_mcp-core');

createServer({
  name: 'playwright-mcp',
  version: '0.1.0',
  tools: [
    {
      name: 'e2e_flow',
      description: 'Run an E2E flow with Playwright. Requires dev server on http://localhost:3000',
      inputSchema: {
        type: 'object',
        properties: {
          scenario: { type: 'string', description: 'scenario id: login|room-create|disconnect-reconnect' }
        },
        required: ['scenario'],
        additionalProperties: false
      },
      run: async ({ scenario }) => {
        const { chromium } = await import('playwright');
        const browser = await chromium.launch();
        const page = await browser.newPage();
        const shots = [];
        try {
          if (scenario === 'login') {
            const email = process.env.PJ_TEST_EMAIL;
            const password = process.env.PJ_TEST_PASSWORD;
            if (!email || !password) {
              throw new Error('Missing PJ_TEST_EMAIL or PJ_TEST_PASSWORD env');
            }
            // Attempt signup (ignore if already exists)
            try {
              const res = await fetch('http://localhost:3000/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, displayName: 'Playwright User' })
              });
              if (!res.ok && res.status !== 409) {
                const t = await res.text();
                throw new Error(`Signup failed: ${res.status} ${t}`);
              }
            } catch (e) {
              // continue; may already exist
            }
            await page.goto('http://localhost:3000/login');
            await page.fill('#email', email);
            await page.fill('#password', password);
            await page.screenshot({ path: '.playwright-mcp/login-1-filled.png' });
            shots.push('.playwright-mcp/login-1-filled.png');
            await Promise.all([
              page.click('button[type="submit"]'),
              page.waitForURL('**/rooms', { timeout: 10000 })
            ]);
            await page.screenshot({ path: '.playwright-mcp/login-2-rooms.png' });
            shots.push('.playwright-mcp/login-2-rooms.png');
            await browser.close();
            return { ok: true, shots };
          }
          if (scenario === 'room-create') {
            await page.goto('http://localhost:3000');
            await page.screenshot({ path: '.playwright-mcp/room-create-1-home.png' });
            shots.push('.playwright-mcp/room-create-1-home.png');
            await page.goto('http://localhost:3000/rooms/create');
            await page.screenshot({ path: '.playwright-mcp/room-create-2-form.png' });
            shots.push('.playwright-mcp/room-create-2-form.png');
          } else if (scenario === 'disconnect-reconnect') {
            await page.goto('http://localhost:3000');
            await page.screenshot({ path: '.playwright-mcp/disco-1-home.png' });
            shots.push('.playwright-mcp/disco-1-home.png');
            // Simulate disconnect by closing and reopening
            await browser.close();
            const b2 = await chromium.launch();
            const p2 = await b2.newPage();
            await p2.goto('http://localhost:3000');
            await p2.screenshot({ path: '.playwright-mcp/disco-2-reconnect.png' });
            shots.push('.playwright-mcp/disco-2-reconnect.png');
            await b2.close();
            return { ok: true, shots };
          }
          await browser.close();
          return { ok: true, shots };
        } catch (e) {
          try { await browser.close(); } catch {}
          return { ok: false, error: e.message, shots };
        }
      }
    }
  ]
});
