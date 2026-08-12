/**
 * The error popup, ported from the react app's notistack.
 *
 * The react version wraps the tree in notistack's <SnackbarProvider> (top
 * right, three at a time) and calls `enqueueSnackbar(message, {variant,
 * preventDuplicate})` from wherever something failed. Both halves are here:
 * this module is the queue, <Snackbars /> renders it, and the call sites keep
 * the exact same shape, so a line copied from a react component works as it
 * stands.
 *
 * It is a plain module holding a `$state` array — the queue is one list that
 * the whole app appends to, which is what a provider and a context were doing
 * in react and what a module-level rune does natively here.
 */

export type SnackbarVariant = 'default' | 'error' | 'success' | 'warning' | 'info';

export interface Snack {
  id: number;
  message: string;
  variant: SnackbarVariant;
}

export interface SnackbarOptions {
  variant?: SnackbarVariant;
  /** drop the message if one with the same text is already on screen */
  preventDuplicate?: boolean;
  /** milliseconds before it dismisses itself */
  autoHideDuration?: number;
}

/** notistack's `maxSnack`, set to 3 in pageRender.jsx */
const MAX_SNACK = 3;
/** notistack's default `autoHideDuration` */
const AUTO_HIDE = 5000;

/** The queue, oldest first. Read by <Snackbars />, and by nothing else. */
export const snacks = $state<Snack[]>([]);

let nextId = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

/**
 * Shows a message. Returns its id, or -1 when `preventDuplicate` suppressed it.
 *
 *   enqueueSnackbar('wrong username or password', {
 *     variant: 'error',
 *     preventDuplicate: true,
 *   });
 */
export function enqueueSnackbar(
  message: string,
  { variant = 'default', preventDuplicate = false, autoHideDuration = AUTO_HIDE }: SnackbarOptions = {}
): number {
  if (preventDuplicate && snacks.some((s) => s.message === message)) {
    return -1;
  }

  const id = ++nextId;
  snacks.push({ id, message, variant });

  // notistack keeps `maxSnack` on screen and queues the rest; dropping the
  // oldest instead means the newest message — the one describing what just
  // happened — is never the one waiting for a slot.
  while (snacks.length > MAX_SNACK) {
    closeSnackbar(snacks[0].id);
  }

  timers.set(
    id,
    setTimeout(() => closeSnackbar(id), autoHideDuration)
  );
  return id;
}

/** Dismisses a message early. Doing it twice is harmless. */
export function closeSnackbar(id: number): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    timers.delete(id);
  }
  const i = snacks.findIndex((s) => s.id === id);
  if (i !== -1) snacks.splice(i, 1);
}
