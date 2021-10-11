import React, { Fragment } from "react";
import { useAlert } from "react-alert";
import mainContext from '../contexts/mainContext'
import { io } from "socket.io-client";
import {Button, Alert} from '@mui/material';

const socket = io('http://localhost:5000');
const Home = () => {
  const alert = useAlert();
  let {state, setState, post} = React.useContext(mainContext)

  return (
    <Fragment>
      <p>{state.loading ? 1 : 0}</p>
      <Button variant="contained"
        onClick={() => {
          alert.show("Oh look, an alert!");
        }}
      >
        Show Alert
      </Button>
      <Button variant="outlined"
        onClick={() => {
          alert.error("You just broke something!");
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
