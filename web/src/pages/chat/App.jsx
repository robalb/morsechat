import * as React from 'react';

import pageRender from '../../pageRender/pageRender'
import {AppLayout} from "./AppLayout";

import {pusherClient} from  '../../utils/apiResolver'

import { useSelector, useDispatch } from 'react-redux'

import { setConnected } from '../../redux/chatSlice'

function App(props){

  const dispatch = useDispatch()
  let loading = useSelector(state => state.api.loading)
  let csrf = useSelector(state => state.api.csrf)
  let callsign = useSelector(state => state.user.callsign)
  let app = useSelector(state => state.app)
  let channel = useSelector(state => state.chat.channel)

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
      if(loading == false){
        if(pusher.current === null){
          //initialize the pusher client
          pusher.current = pusherClient(
            csrf,
            app.pusher_key,
            app.pusher_host,
            app.pusher_port,
            app.pusher_cluster
          )
          //update pusher server connection status
          //this is not related to the channel subscription
          pusher.current.connection.bind('state_change', (states)=>{
            dispatch(setConnected(states.current))
          })
        }else{
          console.warn("reinitializing pusher ref")
        }
      }
  }, [loading]);


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
      dispatch(setConnected('connecting'))
      pusherChannel.current.bind('pusher:subscription_succeeded', e =>{
        dispatch(setConnected('connected'))
        logTest('pusher:subscription_succeeded')(e)
      })
      pusherChannel.current.bind('pusher:subscription_error', e =>{
        dispatch(setConnected( 'connection failed'))
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
  }, [channel, callsign])


  return(
    <AppLayout />
  )
}

pageRender(App)
