import * as React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import {Typography, Grid, TextField, Link, Stack, IconButton} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DoneIcon from '@mui/icons-material/Done';
import { useDispatch, useSelector} from 'react-redux'
import { apiCall } from "../../redux/apiSlice";
import { useSnackbar } from 'notistack';

export function ReportMessage({ open, onClose, data }) {
  let [btDisabled, setBtDisabled] = React.useState(false)
  let [reported, setReported] = React.useState(false)
  let authenticated = useSelector(state => state.user.authenticated)
  const {enqueueSnackbar} = useSnackbar();
  const dispatch = useDispatch()
  async function handleReport(){
    if(!data || !data.text || !data.signature){
      let error = "Failed to generate report"
      enqueueSnackbar(error, {variant: "error", preventDuplicate:true})
      return
    }
    setBtDisabled(true)
    try{
      let response = await dispatch(apiCall({
        endpoint: "chat/report",
        data
      }))
      .unwrap()
    }
    catch(e){
      let error = "Report failed: " + e.error
      enqueueSnackbar(error, {variant: "error", preventDuplicate:true})
      setBtDisabled(false)
      return
    }
    enqueueSnackbar("Message reported", {variant: "success", preventDuplicate:true})
    onClose()
    setReported(true)
    setBtDisabled(false)
  }
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
          Do you think this message represents spam or inappropriate speech?
          </p>
          <code>{data?.text}</code>
        </div>

      </DialogContent>
      <DialogActions>
        <Button onClick={handleReport} disabled={btDisabled} color="error" variant="contained">Report</Button>
        <Button onClick={onClose} color="primary" variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
}

