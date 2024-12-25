import * as React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import {Typography, Grid, TextField, Link, Stack, IconButton} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';


import styles from './user.module.css';

export function User({ open, onClose, user }) {
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
        <Button onClick={onClose} color="primary">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
