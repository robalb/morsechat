import puppeteer from 'puppeteer';

export const PREVIEW = '[data-harness="preview-text"]';
export const KEY_LEFT = '[data-harness="key-left"]';
export const KEY_RIGHT = '[data-harness="key-right"]';

const DESKTOP = { width: 1500, height: 950, deviceScaleFactor: 1 };
const PHONE = { width: 420, height: 850, deviceScaleFactor: 1, hasTouch: true, isMobile: true };

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function launch({ headful = false } = {}) {
  return puppeteer.launch({
    headless: !headful,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
  });
}

export async function openApp(browser, { url, channel, touch = false, settings = {} }) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.setViewport(touch ? PHONE : DESKTOP);
  await page.goto(`${url.replace(/\/$/, '')}/?channel=${encodeURIComponent(channel)}`, {
    waitUntil: 'load',
  });

  try {
    await page.waitForFunction(() => window.morsechat?.chat.connectionStatus === 'connected', {
      timeout: 20000,
    });
  } catch {
    const state = await page.evaluate(() =>
      window.morsechat
        ? `connection status "${window.morsechat.chat.connectionStatus}"`
        : 'window.morsechat is missing, so this is not a dev build of the webapp'
    );
    throw new Error(`the app at ${url} did not connect: ${state}. ${errors.join(' | ')}`);
  }
  const connectedAt = Date.now();

  await page.evaluate((values) => Object.assign(window.morsechat.user.settings, values), settings);
  await page.waitForSelector(KEY_LEFT);
  if (settings.key_mode === 'yambic') await page.waitForSelector(KEY_RIGHT);
  await page.evaluate(() => document.activeElement?.blur());
  await page.bringToFront();

  const info = await page.evaluate(() => {
    const { user, chat } = window.morsechat;
    return JSON.parse(
      JSON.stringify({ callsign: user.callsign, channel: chat.channel, settings: user.settings })
    );
  });
  return { page, context, errors, connectedAt, ...info };
}

export function dialectTable(page, name) {
  return page.evaluate(
    (dialect) => JSON.parse(JSON.stringify(window.morsechat.dialects[dialect]?.table ?? null)),
    name
  );
}

export function recordPreview(page) {
  return page.evaluate((selector) => {
    const node = document.querySelector(selector);
    const log = [];
    window.__harnessPreview = log;
    let last = null;
    const snap = () => {
      const text = node.textContent ?? '';
      if (text === last) return;
      last = text;
      log.push({ t: Date.now(), text, buffer: [...window.morsechat.keyer.buffer] });
    };
    new MutationObserver(snap).observe(node, { characterData: true, childList: true, subtree: true });
    snap();
  }, PREVIEW);
}

export function recordChat(page) {
  return page.evaluate(() => {
    const root = document.querySelector('.chatContent');
    const log = [];
    window.__harnessChat = log;
    let last = '';
    const snap = () => {
      const paragraph = [...root.querySelectorAll('p[data-callsign]')].at(-1);
      if (!paragraph) return;
      const [, morse, text] = paragraph.children;
      const entry = {
        t: Date.now(),
        callsign: paragraph.dataset.callsign,
        morse: morse?.textContent ?? '',
        text: text?.textContent ?? '',
      };
      const key = JSON.stringify([entry.callsign, entry.morse, entry.text]);
      if (key === last) return;
      last = key;
      log.push(entry);
    };
    new MutationObserver(snap).observe(root, { childList: true, subtree: true, characterData: true });
  });
}

export function collect(page) {
  return page.evaluate(() => ({
    preview: window.__harnessPreview ?? [],
    chat: window.__harnessChat ?? [],
    system: [...document.querySelectorAll('.chatContent p:not([data-callsign])')].map(
      (p) => p.textContent ?? ''
    ),
  }));
}
