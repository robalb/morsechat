import React, { Fragment } from "react";
import { useAlert } from "react-alert";
import mainContext from '../contexts/mainContext'
import { io } from "socket.io-client";

const socket = io('http://localhost:5000');
const Home = () => {
  const alert = useAlert();
  let {state, setState, post} = React.useContext(mainContext)

  return (
    <Fragment>
      <p>{state.loading ? 1 : 0}</p>
      <button
        onClick={() => {
          alert.show("Oh look, an alert!");
        }}
      >
        Show Alert
      </button>
      <button
        onClick={() => {
          alert.error("You just broke something!");
        }}
      >
        Oops, an error
      </button>
      <button
        onClick={() => {
          // alert.success("It's ok now!");
          post('user', {})
        }}
      >
        Success!
      </button>
    </Fragment>
  );
};

export default Home;
