import * as React from 'react';

import pageRender from '../../pageRender/pageRender'
import {AppLayout} from "./AppLayout";

import {pusherClient} from  '../../utils/apiResolver'

import appContext from "../../contexts/appContext";
import mainContext from '../../contexts/mainContext'


function App(props){

  //TODO TOREMOVE
  let {connected, setConnected, channel} = React.useContext(appContext);
  //TODO TOREMOVE
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
            setConnected({
              info: states.current,
              green: states.current == 'connected'
            })
          })
        }else{
          console.warn("reinitializing pusher ref")
        }
      }
  }, [state.loading]);


  function logTest(type){
    return e =>{
      console.log("+++++ " + type)
      console.log(e)
    }
  }


  /**
   * channel connection effect
   * - runs on every change of the selected channel, or of the user callsign
   * - unsubscribes from the previous channel
   * - connects to the new channel, updating the bindings
   */
  React.useEffect(()=>{
    if(pusher.current){
      console.log(">> effect: subscribing to channel " + channel)
      pusherChannel.current = pusher.current.subscribe(channel)
      setConnected({
        info: 'connecting',
        green: true
      })
      pusherChannel.current.bind('pusher:subscription_succeeded', e =>{
        setConnected({
          info: 'connected',
          green: true
        })
        logTest('pusher:subscription_succeeded')(e)
      })
      pusherChannel.current.bind('pusher:subscription_error', e =>{
        setConnected({
          info: 'connection failed',
          green: false
        })
        logTest('pusher:subscription_error')(e)
      })
      pusherChannel.current.bind('pusher:member_added', logTest('pusher:member_added'))
      pusherChannel.current.bind('pusher:member_removed', logTest('pusher:member_removed'))
      pusherChannel.current.bind('msg', logTest('msg'))
      pusherChannel.current.bind('typing', logTest('typing'))
      return ()=>{
        console.log(">> effect: unsubscribing from channel " + channel);
        pusherChannel.current.unbind()
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
