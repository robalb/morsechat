import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Stack,
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { closeDialog } from '../../redux/dialogSlice';
import { useSnackbar } from 'notistack';

export const BanUserDialog = () => {
  const dispatch = useDispatch();
  const {enqueueSnackbar} = useSnackbar();
  const { open, username, session, revert } = useSelector((state) => state.dialog);

  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) setNotes('');
  }, [open]);

  const handleConfirm = () => {
    if (!notes.trim()) return;

    if (revert) {
      console.log(`Reverting ban for ${username} (session: ${session}) with notes: ${notes}`);
      // API call for reverting a ban
      enqueueSnackbar("failed to call api", {variant: "error", preventDuplicate:true})
    } else {
      console.log(`Banning ${username} (session: ${session}) with notes: ${notes}`);
      // API call for banning
      enqueueSnackbar("failed to call api", {variant: "error", preventDuplicate:true})
    }

    dispatch(closeDialog());
  };

  const title = revert ? 'Revert Ban' : 'Ban User';
  const actionLabel = revert ? 'Revert Ban' : 'Ban';
  const displayUser = username ? `user "${username}"` : "this anonymous user"
  const description = revert
    ? `Are you sure you want to REVERT the ban on ${displayUser}?`
    : `Are you sure you want to BAN ${displayUser}?`;

  return (
    <Dialog open={open} onClose={() => dispatch(closeDialog())} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography>{description}</Typography>
          {session && 
            <Typography>User device: {session}</Typography>
          }
          <TextField
            multiline
            minRows={3}
            fullWidth
            label="Moderator Notes"
            placeholder="Write your reason or notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => dispatch(closeDialog())}>Cancel</Button>
        <Button
          color={revert ? 'primary' : 'error'}
          variant="contained"
          onClick={handleConfirm}
          disabled={!notes.trim()}
        >
          {actionLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
