import React, { Fragment } from "react";
import { useSnackbar } from 'notistack';
import mainContext from '../contexts/mainContext'
import { io } from "socket.io-client";
import {Button, Alert} from '@mui/material';

const socket = io('http://localhost:5000');
const Home = () => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  let {state, post} = React.useContext(mainContext)

  return (
    <Fragment>
      <p>{state.loading ? 1 : 0}</p>
      <Button variant="contained"
        onClick={() => {
          enqueueSnackbar("Oh look", {variant: "show"})
        }}
      >
        Show Alert
      </Button>
      <Button variant="outlined"
        onClick={() => {
          enqueueSnackbar("Oh look", {variant: "error"})
        }}
      >
        Oops, an error
      </Button>
      <Button
        onClick={() => {
          // alert.success("It's ok now!");
          post('user', {})
        }}
      >
        Success!
      </Button>
    </Fragment>
  );
};

export default Home;
