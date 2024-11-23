import React from 'react';
import {Typography, Grid, Button, IconButton, Skeleton} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const VerificationForm = ({setPage}) =>{
  function handleCancel(){
    setPage("")
  }
  return (
    <Grid container spacing={3} >
      <Grid item xs={12} >
        <IconButton aria-label="close" color="primary" onClick={e => setPage("") }>
          <CloseIcon />
        </IconButton>
      </Grid>
      <Grid item xs={12} >
        <Typography variant="h5" color="secondary" >
          one last step
        </Typography>
        <Typography variant="body2" color="primary" >
          (optional)
        </Typography>
      </Grid>
      <Grid item xs={12} >
        <Typography variant="body2" color="primary" >
          Verify your account to enable passwordless logins in one click, and avoid usage limitations.
        </Typography>
        <Typography variant="body2" color="primary" >
          This is the only option to recover your account if you forget your credentials
        </Typography>
      </Grid>
      <Grid item xs={12} >
        <Skeleton animation="wave" height={118} />
        <Skeleton animation="wave" height={118} />
      </Grid>
      <Grid item xs={12} >
        <Button size="medium" color="primary" onClick={handleCancel} variant="contained">
          skip
        </Button>
      </Grid>
    </Grid>
  )
}

export default VerificationForm
