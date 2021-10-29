import React from 'react';
import {Typography, Grid} from '@mui/material';

const RegisterForm = ({state, reload, setPage, post}) =>{
  let [form, setForm] = React.useState({

  })
  return (
  <>
    <Grid container spacing={3}>
      <Grid item xs={12} >
        <Typography variant="h5" color="primary" >
          Register
        </Typography>
      </Grid>
    </Grid>
  </>
  )
}

export default RegisterForm
