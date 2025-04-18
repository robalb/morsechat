import * as React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import {Typography, Grid, TextField, Link, Stack, IconButton} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useDispatch, useSelector} from 'react-redux'
import BanButton from "../moderation/BanButton";
import MuteButton from "../moderation/MuteButton";

import styles from './user.module.css';

export function User({ open, onClose, user }) {
  let ismoderator = useSelector(state => state.user.ismoderator)
  let isadmin = useSelector(state => state.user.isadmin)
  return (
    <Dialog
      PaperProps={{
        elevation: 1
      }}
      fullScreen={false}
      open={open}
      onClose={onClose}
    >
      <DialogTitle>
          <IconButton aria-label="close" color="primary" onClick={onClose}>
            <CloseIcon />
          </IconButton> User Information
      </DialogTitle>
      <DialogContent>
        <div className={styles.user}>
          <p><strong>Callsign:</strong> {user?.callsign}</p>
          {user?.is_anonymous && 
            <p>(Anonymous user, not logged in)</p>
            } 
          {!user?.is_anonymous && 
            <p><strong>Username:</strong> {user?.username}</p>
            } 
        </div>
      </DialogContent>
      <DialogActions>
        {(ismoderator || isadmin) && !user?.is_anonymous && (
          <>
            <BanButton color="error" variant="contained"
              username={user?.username || ""}
            >Ban</BanButton>
            <MuteButton color="primary" variant="contained" callsign={user?.callsign} >
            Mute
            </MuteButton>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
