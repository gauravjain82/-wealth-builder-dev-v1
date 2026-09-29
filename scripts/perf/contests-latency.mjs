#!/usr/bin/env node
/**
 * Contests page latency check — Phase 10 of the dtez parity plan
 * (mlm_platform/docs/integrations/wb-contests/PARITY_PLAN.md).
 *
 * Opens /contests in the installed Chrome, records every /api/ request, and reports:
 *   - seconds until the first standings are on screen,
 *   - seconds for one contest switch,
 *   - each API call's total time, server wait and size.
 *
 * Signing in is done by a person, never by this script: `--login` opens a visible window
 * on /login and waits until you are signed in. The session is kept in a Chrome profile
 * outside the repo, so later runs are headless.
 *
 *   npm run perf:contests -- --login      # once: sign in with an account holding homev2:read
 *   npm run perf:contests                 # measure (3 runs, median reported)
 *   npm run perf:contests -- --runs 5 --json
 *   npm run perf:contests -- --dwell 10     # wait 10 s on the first contest before switching
 *
 * `--dwell` (default 0) is for the contest-switch prefetch (parity Phase 12): with no dwell
 * the switch fires the instant the first standings appear, so it measures a prefetch still
 * in flight, not a switch served from cache.
 *
 * Environment:
 *   WB_PERF_URL      app origin (default http://localhost:3000, the dev server's port in vite.config.ts)
 *   WB_PERF_PROFILE  Chrome profile directory (default <os tmp>/wb-perf-chrome-profile)
 */
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { chromium } from 'playwright-core';

const { values: args } = parseArgs({
  options: {
    login: { type: 'boolean', default: false },
    runs: { type: 'string', default: '3' },
    json: { type: 'boolean', default: false },
    dwell: { type: 'string', default: '0' },
  },
});

const BASE = process.env.WB_PERF_URL ?? 'http://localhost:3000';
const PROFILE = process.env.WB_PERF_PROFILE ?? path.join(os.tmpdir(), 'wb-perf-chrome-profile');
const LOADING_TEXT = ['Loading standings', 'Updating'];
const TIMEOUT_MS = 120_000;

const standingsSettled = () =>
  document.querySelector('.wb-ct-results, .wb-ct-table, .wb-ct-cards, .wb-ct-state') &&
  !['Loading standings', 'Updating'].some((text) => document.body.innerText.includes(text));

async function login() {
  const context = await chromium.launchPersistentContext(PROFILE, { channel: 'chrome', headless: false });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`${BASE}/login`);
  console.log('Sign in in the Chrome window. Waiting up to 15 minutes…');
  await page.waitForFunction(
    () => !!localStorage.getItem('wb.authToken') && !location.pathname.startsWith('/login'),
    null,
    { timeout: 15 * 60 * 1000, polling: 1000 },
  );
  await context.close();
  console.log(`Signed in. Session saved in ${PROFILE}.`);
}

async function measureOnce() {
  const context = await chromium.launchPersistentContext(PROFILE, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 1000 },
  });
  const page = context.pages()[0] ?? (await context.newPage());
  const started = Date.now();
  const calls = [];
  page.on('requestfinished', async (request) => {
    if (!request.url().includes('/api/')) return;
    const timing = request.timing();
    const response = await request.response();
    const body = await response?.body().catch(() => null);
    calls.push({
      atS: (Date.now() - started) / 1000,
      totalMs: Math.round(timing.responseEnd),
      serverMs: Math.round(timing.responseStart - timing.requestStart),
      kb: Math.round((body?.length ?? 0) / 1024),
      status: response?.status() ?? 0,
      path: request.url().replace(/^https?:\/\/[^/]+/, ''),
    });
  });

  try {
    await page.goto(`${BASE}/contests`);
    await page.waitForFunction(
      () => location.pathname !== '/contests' || document.querySelector('.wb-ct'),
      null,
      { timeout: TIMEOUT_MS },
    );
    const where = new URL(page.url()).pathname;
    if (where.startsWith('/login')) throw new Error('Not signed in. Run with --login first.');
    if (where !== '/contests') throw new Error(`Redirected to ${where}: this account lacks homev2:read.`);

    await page.waitForFunction(standingsSettled, null, { timeout: TIMEOUT_MS });
    const firstStandingsS = (Date.now() - started) / 1000;

    const dwellMs = Math.max(0, Number(args.dwell) || 0) * 1000;
    if (dwellMs) await page.waitForTimeout(dwellMs);

    // Since parity phase 18 the page's contests are a row of buttons; the Home v2 card
    // keeps a <select>. Either way the switch goes to the second contest.
    let switchS = null;
    const buttons = page.locator('[role="group"][aria-label="Contest"] button');
    const options = await page.$$eval('select[aria-label="Contest"] option', (items) => items.map((o) => o.value));
    if ((await buttons.count()) > 1 || options.length > 1) {
      const switchStarted = Date.now();
      if ((await buttons.count()) > 1) await buttons.nth(1).click();
      else await page.selectOption('select[aria-label="Contest"]', options[1]);
      await page.waitForFunction(standingsSettled, null, { timeout: TIMEOUT_MS });
      switchS = (Date.now() - switchStarted) / 1000;
    }
    await page.waitForTimeout(500); // let the last requestfinished handlers resolve
    return { firstStandingsS, switchS, calls };
  } finally {
    await context.close();
  }
}

const median = (values) => {
  const sorted = values.filter((v) => v !== null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

if (args.login) {
  await login();
} else {
  const runs = Math.max(1, Number(args.runs) || 3);
  const results = [];
  for (let run = 0; run < runs; run += 1) results.push(await measureOnce());

  const standingsCalls = results.flatMap((r) => r.calls.filter((c) => c.path.includes('/standings/')));
  const summary = {
    runs,
    firstStandingsS: median(results.map((r) => r.firstStandingsS)),
    contestSwitchS: median(results.map((r) => r.switchS)),
    standingsServerMs: median(standingsCalls.map((c) => c.serverMs)),
    apiCallsBeforeFirstStandings: median(
      results.map((r) => r.calls.filter((c) => c.atS <= r.firstStandingsS).length),
    ),
  };

  if (args.json) {
    console.log(JSON.stringify({ summary, lastRun: results.at(-1).calls }, null, 1));
  } else {
    const dwell = Number(args.dwell) || 0;
    console.log(`Contests latency — ${BASE}, median of ${runs} run(s)${dwell ? `, ${dwell} s dwell before the switch` : ''}`);
    console.log(`  first standings visible   ${summary.firstStandingsS?.toFixed(2)} s`);
    console.log(`  contest switch            ${summary.contestSwitchS?.toFixed(2) ?? 'n/a'} s`);
    console.log(`  standings server time     ${summary.standingsServerMs} ms`);
    console.log(`  API calls before standings ${summary.apiCallsBeforeFirstStandings}`);
    console.log('\nLast run, API waterfall:');
    for (const c of results.at(-1).calls) {
      console.log(
        `  ${c.atS.toFixed(1).padStart(5)}s ${String(c.totalMs).padStart(6)}ms ` +
          `(server ${String(c.serverMs).padStart(5)}ms) ${String(c.kb).padStart(4)}KB ${c.status} ${c.path.slice(0, 110)}`,
      );
    }
  }
}
