import React from 'react';
import {Typography, Grid, TextField, Button, Divider, IconButton} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import CallSignEditor from './callSignEditor/callSignEditor'


const RegisterForm = ({state, reload, setPage, post}) =>{
  let [form, setForm] = React.useState({
    username: '',
    email: '',
    password: '',
    callSign: undefined
  })

  function handleUpdate(type){
    return function update(data){
      setForm(f => ({
        ...f,
        [type]: data.target.value
      }))
    }
  }

  function handleRegister(){

  }

  return (
    <Grid container spacing={3} >


      <Grid item xs={12} >
        <IconButton aria-label="close" color="primary" onClick={e => setPage("menu") }>
          <CloseIcon />
        </IconButton>
      </Grid>
      <Grid item xs={12} >
        <Typography variant="h5" color="primary" >
          your call sign
        </Typography>
      </Grid>
      <Grid item xs={12} >
        <CallSignEditor setData={e => setForm( f => ({...f, callSign:e}) )}/>
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
        <TextField label="Username" type="text" value={form.username} onChange={handleUpdate('username')} fullWidth variant="standard" />
      </Grid>
      <Grid item xs={12} md={6} >
        <TextField label="Email" type="email" value={form.email} onChange={handleUpdate('email')} fullWidth variant="standard" />
      </Grid>
      <Grid item xs={12} >
        <TextField label="password" type="password" value={form.password} onChange={handleUpdate('password')} fullWidth variant="standard" />
      </Grid>
      <Grid item xs={12} >
        <Button size="medium" color="secondary" onClick={handleRegister} variant="contained">
          Register
        </Button>
      </Grid>
    </Grid>
  )
}

export default RegisterForm
