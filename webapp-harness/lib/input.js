import { KEY_LEFT, KEY_RIGHT, sleep } from './app.js';

export const INPUTS = ['keyboard', 'mouse', 'pen', 'touch'];

const NAMED_KEYS = ['Space', 'Enter', 'Tab', 'Shift', 'Control', 'Alt', 'Escape', 'Backspace',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
const BUTTON_MASK = { left: 1, right: 2, middle: 4 };

function keyName(binding) {
  return NAMED_KEYS.find((name) => name.toLowerCase() === binding) ?? binding;
}

async function center(page, selector) {
  const box = await (await page.$(selector)).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export async function openDevice(page, kind, settings, { button = 'left' } = {}) {
  const side = (control) =>
    control === 'key' || (control === 'dot') === settings.left_is_dot ? 'left' : 'right';

  if (kind === 'keyboard') {
    const { keybinds } = settings;
    const keys = {
      key: keyName(keybinds.straight.find((k) => k !== 'space') ?? keybinds.straight[0]),
      left: keyName(keybinds.yambic_left[0]),
      right: keyName(keybinds.yambic_right[0]),
    };
    return {
      describe: () => `keys ${JSON.stringify(keys)}`,
      set: (control, down) => {
        const key = keys[control === 'key' ? 'key' : side(control)];
        return down ? page.keyboard.down(key) : page.keyboard.up(key);
      },
    };
  }

  const targets = {
    left: await center(page, KEY_LEFT),
    right: settings.key_mode === 'yambic' ? await center(page, KEY_RIGHT) : null,
  };

  if (kind === 'touch') {
    const touches = {};
    return {
      describe: () => `touch at ${JSON.stringify(targets)}`,
      set: async (control, down) => {
        const target = side(control);
        if (down) {
          const { x, y } = targets[target];
          touches[target] = await page.touchscreen.touchStart(x, y);
        } else {
          await touches[target]?.end();
          delete touches[target];
        }
      },
    };
  }

  if (kind !== 'mouse' && kind !== 'pen') throw new Error(`unknown input "${kind}"`);
  const cdp = await page.createCDPSession();
  const dispatch = (type, { x, y }, pressed) =>
    cdp.send('Input.dispatchMouseEvent', {
      type,
      x,
      y,
      button: type === 'mouseMoved' ? 'none' : button,
      buttons: pressed ? BUTTON_MASK[button] : 0,
      clickCount: type === 'mouseMoved' ? 0 : 1,
      pointerType: kind,
    });
  let pressed = null;
  return {
    describe: () => `${kind} ${button} button at ${JSON.stringify(targets)}`,
    set: async (control, down) => {
      const target = side(control);
      if (down) {
        if (pressed) throw new Error(`a ${kind} cannot hold two paddles at once, drop --squeeze`);
        await dispatch('mouseMoved', targets[target], false);
        await dispatch('mousePressed', targets[target], true);
        pressed = target;
      } else if (pressed === target) {
        await dispatch('mouseReleased', targets[target], false);
        pressed = null;
      }
    },
  };
}

async function sleepUntil(at) {
  const wait = at - Date.now();
  if (wait > 0) await sleep(wait);
}

async function pressEnded(page, since, length, timeout) {
  const handle = await page.waitForFunction(
    (after, previous) => {
      const render = window.__harnessPreview.find(
        (entry) => entry.t >= after && entry.buffer.length % 2 === 1 && entry.buffer.length !== previous
      );
      return render ? [render.t, render.buffer.length] : false;
    },
    { polling: 4, timeout },
    since,
    length
  );
  return handle.jsonValue();
}

export async function performIambic(page, device, letters, dot) {
  const inputs = [];
  let held = new Set();
  const hold = async (paddles, intended) => {
    const changes = [
      ...[...held].filter((paddle) => !paddles.has(paddle)).map((paddle) => [paddle, false]),
      ...[...paddles].filter((paddle) => !held.has(paddle)).map((paddle) => [paddle, true]),
    ];
    for (const [control, down] of changes) {
      const t = Date.now();
      await device.set(control, down);
      inputs.push({ t, type: down ? 'down' : 'up', control, late: t - Math.round(intended) });
    }
    held = paddles;
  };

  let lastUp = null;
  let length = 0;
  for (const letter of letters) {
    for (const [i, paddles] of letter.paddles.entries()) {
      const at = i > 0 ? lastUp + dot / 2 : lastUp === null ? Date.now() : lastUp + letter.gap;
      await sleepUntil(at);
      const since = Date.now();
      await hold(new Set(paddles), at);
      [lastUp, length] = await pressEnded(page, i > 0 ? lastUp + 1 : since, length, 4 * dot + 2000);
    }
    await sleepUntil(lastUp + dot / 2);
    await hold(new Set(), lastUp + dot / 2);
  }
  return { inputs };
}

export async function perform(device, plan) {
  let start = null;
  const inputs = [];
  for (const step of plan) {
    if (start !== null) {
      const wait = start + step.at - Date.now();
      if (wait > 0) await sleep(wait);
    }
    const t = Date.now();
    await device.set(step.control, step.down);
    if (start === null) start = t - step.at;
    inputs.push({ t, type: step.down ? 'down' : 'up', control: step.control, late: t - (start + step.at) });
  }
  return { start, inputs };
}
