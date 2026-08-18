/**
 * State of the ban confirmation popup, which <BanUserDialog /> renders once for
 * the whole app. Port of webapp/src/redux/dialogSlice.ts.
 */
export interface BanDialogState {
  open: boolean;
  /** empty when the target is anonymous */
  username: string;
  /** device id, empty when banning by account only */
  session: string;
  revert: boolean;
}

export const banDialog: BanDialogState = $state({
  open: false,
  username: '',
  session: '',
  revert: false,
});

/** The server rejects a ban that carries neither a username nor a session. */
export function openBanDialog({
  username = '',
  session = '',
  revert = false,
}: Partial<Omit<BanDialogState, 'open'>> = {}) {
  banDialog.username = username;
  banDialog.session = session;
  banDialog.revert = revert;
  banDialog.open = true;
}

export function closeBanDialog() {
  banDialog.open = false;
}
