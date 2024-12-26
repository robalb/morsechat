import * as React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import {Typography, Grid, TextField, Link, Stack, IconButton} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export function ReportMessage({ open, onClose, data }) {
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
          </IconButton> Report Message
      </DialogTitle>
      <DialogContent>
        <div >
          <p>
          Is this message inapropriate?
          The message author will also be reported.
          </p>
          <p>{data?.text}</p>
        </div>

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="error" variant="contained">Report</Button>
        <Button onClick={onClose} color="primary" variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
}

