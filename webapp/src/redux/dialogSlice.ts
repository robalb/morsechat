// features/banUserDialogSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type BanUserDialogState = {
  open: boolean;
  username: string | null;
  session: string | null;
  revert: boolean;
};

const initialState: BanUserDialogState = {
  open: false,
  username: null,
  session: null,
  revert: false,
};

export const banUserDialogSlice = createSlice({
  name: 'banUserDialog',
  initialState,
  reducers: {
    openDialog: (state, action: PayloadAction<{username:string, session:string, revert:boolean}>) => {
      state.open = true;
      state.username = action.payload.username;
      state.session = action.payload.session;
      state.revert = action.payload.revert;
    },
    closeDialog: (state) => {
      state.open = false;
      // state.username = null;
      // state.session = null;
      // state.revert = false;
    },
  },
});

export const { openDialog, closeDialog } = banUserDialogSlice.actions;
export default banUserDialogSlice.reducer;

