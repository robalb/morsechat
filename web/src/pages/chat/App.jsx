import * as React from 'react';

import pageRender from '../../pageRender/pageRender'
import {AppLayout} from "./AppLayout";

import {pusherClient} from  '../../utils/apiResolver'

import { useSelector, useDispatch } from 'react-redux'

import { selectChannelName, setConnected, setTyping, updateOnline } from '../../redux/chatSlice'

function App(props){
  console.log("APP RERENDER")

  const dispatch = useDispatch()
  let loading = useSelector(state => state.api.loading)
  let csrf = useSelector(state => state.api.csrf)
  let callsign = useSelector(state => state.user.callsign)
  let app = useSelector(state => state.app)
  let channel = useSelector(state => state.chat.channel)
  let channelName = useSelector(selectChannelName)

  const pusher = React.useRef(null)
  const pusherChannel = React.useRef(null)

  /**
   * DomNode containing the chat. there is no need to maintain
   * the chat state or to query it, so this is the most efficient implementation
   */
  const chatDomNode = React.useRef(null)

  //called when a message is received
  function handleMessage(e){
    console.log(e)
    console.log(chatDomNode.current)
    let chat = chatDomNode.current
    let message = document.createElement("div")
    message.innerText = e.id

    chat.insertAdjacentElement("beforeend", message)
  }

  //sync the selected channel with the query param
  //look mom! no react router
  React.useEffect(()=>{
    let searchParams = new URLSearchParams(window.location.search);
    searchParams.set("channel", channelName);
    let newPath = window.location.pathname + '?' + searchParams.toString();
    history.pushState(null, '', newPath);
  }, [channel])

  /**
   * Pusher client initialization effect
   *
   * TODO: unbind all callbacks and check for mem leaks
   */
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
        dispatch(updateOnline(JSON.parse(JSON.stringify(e))))
      })

      pusherChannel.current.bind('pusher:subscription_error', e =>{
        if(e.type === "AuthError")
          dispatch(setConnected('connection denied'))
        else
          dispatch(setConnected('connection failed'))
        dispatch(updateOnline({members: {}, myID: null}))
      })

      pusherChannel.current.bind('pusher:member_added', e => {
        dispatch(updateOnline(JSON.parse(JSON.stringify(
            pusherChannel.current.members
          ))))
        })

      pusherChannel.current.bind('pusher:member_removed', e => {
        dispatch(updateOnline(JSON.parse(JSON.stringify(
            pusherChannel.current.members
          ))))
        })

      pusherChannel.current.bind('message', e=>{
        handleMessage(e)
        dispatch(setTyping({
          user: e.id,
          typing: false
        }))
      })
      pusherChannel.current.bind('typing', e=>{
        console.log(e)
        dispatch(setTyping({
          user: e.id,
          typing: true
        }))
      })
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
    <AppLayout chatDomNode={chatDomNode} />
  )
}

pageRender(App)
