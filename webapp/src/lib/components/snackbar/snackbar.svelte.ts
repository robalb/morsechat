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
