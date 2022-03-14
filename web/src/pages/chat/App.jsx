import * as React from 'react';

import pageRender from '../../pageRender/pageRender'
import {AppLayout} from "./AppLayout";

import {pusherClient} from  '../../utils/apiResolver'

import appContext from "../../contexts/appContext";
import mainContext from '../../contexts/mainContext'



function App(props){

  let {connected, setConnected, channel} = React.useContext(appContext);
  let {state, post, reload} = React.useContext(mainContext)
  const pusher = React.useRef(null)
  const pusherChannel = React.useRef(null)
  /*
  TODO: write here all app logic, using the elements exposed by appLayout
  - define settings, and make them available to to layout via contextApi
  - decide how the key will send events up here(state? callback?)
      idea: send events via callback, and have a down property so that it can
            handle sound and aspect
  
  - write sound utility: you define the frequency, and then start/stop. 
     add security feature: if not stopped after x, stop and log error
  */

  React.useEffect(() => {
    setConnected('loading data')
  }, [])

  /* appstate */
  console.log("APP RERENDER")

  React.useEffect(() => {
      if(state.loading == false){
        if(pusher.current === null){
          pusher.current = pusherClient(
            state.sessionData.csrf,
            state.appData.pusher_key,
            state.appData.pusher_host,
            state.appData.pusher_port,
            state.appData.pusher_cluster
          )

          pusher.current.connection.bind('state_change', (states)=>{setConnected(states.current)})
          pusher.current.connection.bind('state_change', (states)=>{
            setConnected(states.current)
          })

          pusherChannel.current = pusher.current.subscribe(channel);
          pusherChannel.current.bind('my-event', function(data) {
            console.log(JSON.stringify(data));
          });
          //TODO: unbind all callbacks and check for mem leaks
          pusherChannel.current.bind('pusher:subscription_error', function(data) {
            console.log(data)
          })

        }else{
          console.warn("reinitializing pusher ref")
        }
      }

  }, [state.loading, state.userData?.callsign]);

  React.useEffect(()=>{
    if(pusher.current){
      pusher.current.subscribe(channel)
    }
  }, [channel])

  return(
    <AppLayout
      previewWidth={30}
      previewText={"Allor fu la paura un poco queta . che nel lago del cor--.-"}
      previewClearHandler={e=>console.log("clear")}
      connectionStatus={connected}
    />
  )
}

pageRender(App)
