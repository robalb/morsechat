import * as React from 'react';

import pageRender from '../../pageRender/pageRender'
import {AppLayout} from "./AppLayout";


function App(props){
  /*
  TODO: write here all app logic, using the elements exposed by appLayout
  - define settings, and make them available to to layout via contextApi
  - decide how the key will send events up here(state? callback?)
      idea: send events via callback, and have a down property so that it can
            handle sound and aspect
  
  - write sound utility: you define the frequency, and then start/stop. 
     add security feature: if not stopped after x, stop and log error
  */

  /* appstate */
  const initialSettings = {
    wpm: 12,
    volume_receiver: 1,
    volume_key: 1,
    dialect: "asd2d2dwd",
    key_mode: "yambic",
    show_readable: true,
    submit_delay: 1000,
    keybinds: {
      straight: "c",
      yambic_dot: "z",
      yambic_dash: "x",
      cancel_message: "p",
    }
  }
  //todo: add some kind of flag to the settings object, to signal it's state in the
  //live update lifecycle. add reducer options to change that state, and updates
  //should also change the state
  function settingsReducer(state, action){
    switch(action.type){
      case 'update':
        return Object.assign({}, state, action.payload)
      case 'updateAll':
        return Object.assign({}, action.payload);
      default:
        throw new Error("invalid action in settings reducer");
    }
  }
  const [settings, settingsDispatch] = React.useReducer(settingsReducer, initialSettings)

  const initialUsers = []
  //TODO: define a user object structure. something like
  /*
  {
    id,
    activeAudio,
    callsign,
    typing,
    dialect
  }
  */
  
  //TODO: typing and toggleAudio actions
  function usersReducer(state, action){
    switch(action.type){
      case 'add':
        let stateCopy = state.slice(0)
        return stateCopy
      case 'remove':
        stateCopy = state.slice(0)
        return stateCopy
      default:
        throw new Error("invalid action in settings reducer");
    }
  }
  const [users, usersDispatch] = React.useReducer(usersReducer, initialUsers)


  return(
    <AppLayout
      previewWidth={30}
      previewText={"Allor fu la paura un poco queta . che nel lago del cor--.-"}
      previewClearHandler={e=>console.log("clear")}
    />
  )
}

pageRender(App)