import React from 'react';
import {Typography, Grid, TextField, Button, Divider} from '@mui/material';

import CallSignEditor from './callSignEditor/callSignEditor'



const RegisterForm = ({state, reload, setPage, post}) =>{
  let [form, setForm] = React.useState({

  })
  return (
    <Grid container spacing={3} component="form" onSubmit={e => alert("submit")}>
      <Grid item xs={12} >
        <Typography variant="h5" color="primary" >
          Register
        </Typography>
      </Grid>
      <Grid item xs={12} >
        <Typography variant="h5" color="primary" >
          your call sign
        </Typography>
      </Grid>
      <Grid item xs={12} >
        <CallSignEditor setData={e => console.log(e)}/>
      </Grid>
      <Grid item xs={12} >
        <Divider />
      </Grid>
      <Grid item xs={12} >
        <Typography variant="h5" color="primary" >
          account data
        </Typography>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField label="Username" type="text"  fullWidth variant="standard" />
      </Grid>
      <Grid item xs={12} md={6} >
        <TextField label="Email" type="email"  fullWidth variant="standard" />
      </Grid>
      <Grid item xs={12} >
        <TextField label="password" type="password"  fullWidth variant="standard" />
      </Grid>
      <Grid item xs={12} >
        <Button size="medium" color="secondary" variant="contained">
          Join
        </Button>
      </Grid>
    </Grid>
  )
}

export default RegisterForm
