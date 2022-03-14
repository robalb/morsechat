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
  const [channelLast, setChannelLast] = React.useState(null)

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
  console.log("APP RERENDER")

  //TODO: unbind all callbacks and check for mem leaks
  React.useEffect(() => {
      if(state.loading == false){
        if(pusher.current === null){
          //initialize the pusher client
          pusher.current = pusherClient(
            state.sessionData.csrf,
            state.appData.pusher_key,
            state.appData.pusher_host,
            state.appData.pusher_port,
            state.appData.pusher_cluster
          )
          //update pusher server connection status
          //this is not related to the channel subscription
          pusher.current.connection.bind('state_change', (states)=>{
            setConnected(states.current)
          })
          // bind listeners to channel events globally: we won't have more than one
          // channel per session so there is no reason to bind to specific channels
          pusher.current.bind('my-event', function(data) {
            console.log(JSON.stringify(data));
          });
          pusher.current.bind('pusher:subscription_error', function(data) {
            console.log("+++ subscription error")
            console.log(data)
          })
          pusher.current.bind('pusher:subscription_succeeded', function(data) {
            console.log("+++ subscription success")
            console.log(data)
          })

        }else{
          console.warn("reinitializing pusher ref")
        }
      }

  }, [state.loading]);


  /**
   * channel connection effect
   * - runs on every change of the selected channel, or of the user callsign
   * - unsubscribes from the previous channel
   * - connects to the new channel
   */
  React.useEffect(()=>{
    if(pusher.current){
      console.log(">> effect: subscribing to channel " + channel)
      pusher.current.subscribe(channel)
      return ()=>{
        console.log(">> effect: unsubscribing from channel " + channel);
        pusher.current.unsubscribe(channel)
        }
    }
    else{
      console.log(">> effect: subscribing to channel [NO PUSHER YET] " + channel)
    }
  }, [channel, state.userData?.callsign])

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
