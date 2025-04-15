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
import { apiCall } from '../../redux/apiSlice';
import { useSnackbar } from 'notistack';

export const BanUserDialog = () => {
  const dispatch = useDispatch();
  const {enqueueSnackbar} = useSnackbar();
  const { open, username, session, revert } = useSelector((state) => state.dialog);

  const [notes, setNotes] = useState('');
  let [apiPromise, setApiPromise] = React.useState(undefined)

  useEffect(() => {
    if (open) setNotes('');
  }, [open]);

  const handleConfirm = () => {
    if (!notes.trim()) return;


    const livePromise = dispatch(apiCall({
      endpoint: "moderation/ban",
      data: {
        baduser_username: username,
        baduser_session: session,
        notes: notes,
        is_revert: revert
      }
    }))

    // we need to preserve this promise during rerenders if we want to abort it
    setApiPromise(livePromise)
    livePromise.unwrap()
      .then(ret => {
        console.log(ret)
        let actionName = revert ? "ban REVERT successfull." : "ban succesfful"
        enqueueSnackbar(actionName, {variant: "success", preventDuplicate:true})
        dispatch(closeDialog());
      })
      .catch(ret => {
        console.log(ret)
        let actionName = revert ? "ban REVERT failed." : "ban failed"
      enqueueSnackbar(actionName, {variant: "error", preventDuplicate:true})
      dispatch(closeDialog());
      })
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
