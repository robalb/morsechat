import React from 'react';
import {Typography, Grid, TextField, Button, Divider, Stack, Link, IconButton} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from 'notistack';
import { useDispatch } from 'react-redux'
import { registerUser } from '../../redux/userSlice';
import CallSignEditor from '../callSignEditor/callSignEditor'


const RegisterForm = ({setPage}) =>{
  const dispatch = useDispatch()
  const { enqueueSnackbar } = useSnackbar();
  let [form, setForm] = React.useState({
    username: '',
    password: '',
    callsign: undefined
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


  function passwordIsDumb(){
    let mostCommon = [ "123456789", "picture1", "password", "12345678", "1234567890", "Million2", "iloveyou", "aaron431", "password1", "qqww1122",
   "starwars", "qwertyuiop", "asdfghjkl", "aa123456", "trustno1", "princess", "morsecode", "morsechat", "00000000" ]
    if(mostCommon.includes(form.password))
      return true
    if(form.password == form.username)
      return true
    return false
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
    //password dumbness
    else if(passwordIsDumb()){
      setError('password', 'too dumb')
      isGood = false
    }
    //valid callsign
    if(!form.callsign){
      isGood = false
    }
    return isGood
  }


  async function handleRegister(e){
    e.preventDefault()
    resetError()
    if (!clientValidate())
      return
    try{
      const res = await dispatch(registerUser(form)).unwrap()
      setPage("verify")
    }
    catch(res){
      if(res.error == "invalid_username")
        setError('username', 'invalid username')
      else if(res.error == "username_exist")
        setError('username', 'username already registered')
      else if(res.error == "callsign_exist")
        enqueueSnackbar('callsign already taken', {variant: "error", preventDuplicate:true})
      else
        enqueueSnackbar(`registration failed. ${res.error} ${res.details ?? ''}`, {variant: "error", preventDuplicate:true})
    }
  }

  return (
    <form onSubmit={handleRegister}>
      <Grid container spacing={3} >
        <Grid item xs={12} >
          <IconButton aria-label="close" color="primary" onClick={e => setPage("")}>
            <CloseIcon />
          </IconButton>
        </Grid>
        <Grid item xs={12} >
          <Typography variant="h5" color="primary" >
            Create your call sign
          </Typography>
        </Grid>
        <Grid item xs={12} >
          <CallSignEditor setData={e => setForm(f => ({ ...f, callsign: e }))} />
        </Grid>
        <Grid item xs={12} >
          <Divider />
        </Grid>
        <Grid item xs={12} >
          <Typography variant="h5" color="primary" >
            your data
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField label="Username" type="text" value={form.username}
            onChange={handleUpdate('username')} fullWidth variant="standard"
            error={error.username.length > 0} helperText={error.username} />
        </Grid>
        <Grid item xs={12} md={6} >
          <TextField label="password" type="password" value={form.password}
            onChange={handleUpdate('password')} fullWidth variant="standard"
            error={error.password.length > 0} helperText={error.password} />
        </Grid>
        <Grid item xs={12} >
          <Stack direction="row" sx={{ padding: "10px" }} alignItems="center" spacing={1}>
            <Button size="medium" type="submit" color="secondary" variant="contained">
              Register
            </Button>

            <Typography variant="body1" color="primary" >
              Already have an account?
            </Typography>
            <Link
              component="button"
              variant="body1"
              onClick={() => { setPage("login") }}
            >
              login
            </Link>
          </Stack>
        </Grid>
      </Grid>
    </form>
  )
}

export default RegisterForm
