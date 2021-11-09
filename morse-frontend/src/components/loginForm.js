import React from 'react';
import {Typography, Grid, TextField, Button, Divider, IconButton} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from 'notistack';

const LoginForm = ({state, reload, setPage, post}) =>{
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  let [form, setForm] = React.useState({
    username: '',
    password: '',
  })

  const initialError = {
    username: '',
    password: '',
  };
  let [error, _setError] = React.useState(initialError)

  function resetError(){
      _setError(initialError)
  }
  function setError(type, error){
      _setError(f => ({
        ...f,
        [type]: error
      }))
  }

  function handleUpdate(type){
    return function update(data){
      setForm(f => ({
        ...f,
        [type]: data.target.value
      }))
      setError(type, '')
    }
  }


  function clientValidate(){
    let isGood = true
    //username length
    if(form.username.length <3 || form.username.length > 20){
      setError('username', 'invalid length')
      isGood = false
    }
    //username content
    else if(!/^[A-Za-z0-9-_]+$/.test(form.username)){
      setError('username', 'invalid characters')
      isGood = false
    }
    //password length
    if(form.password.length <8 || form.password.length > 255){
      setError('password', 'too short')
      isGood = false
    }
    return isGood
  }
  async function handleLogin(){
    resetError()
    if (!clientValidate())
      return
    const res = await post('login', form, true);
    console.log(res)
    if(res.success){
      reload()
      setPage("menu")
    }
    else if(res.error == "invalid_credentials"){
      enqueueSnackbar('wrong username or password', {variant: "error", preventDuplicate:true})
      setError('username', ' ')
      setError('password', ' ')
    }
    else
      enqueueSnackbar(`registration failed. ${res.error} ${res.details ?? ''}`, {variant: "error", preventDuplicate:true})
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
          Login
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <TextField label="Username" type="text" value={form.username} 
        onChange={handleUpdate('username')} fullWidth variant="standard"
        error={error.username.length > 0} helperText={error.username.trim()} />
      </Grid>
      <Grid item xs={12}>
        <TextField label="password" type="password" value={form.password}
        onChange={handleUpdate('password')} fullWidth variant="standard"
        error={error.password.length > 0} helperText={error.password.trim()} />
      </Grid>
      <Grid item xs={12} >
        <Button size="medium" color="secondary" onClick={handleLogin} variant="contained">
          Login
        </Button>
      </Grid>
    </Grid>
  )
}

export default LoginForm
