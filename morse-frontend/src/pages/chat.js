import React from 'react';
import Providers from '../components/providers/providers'
import mainContext from '../contexts/mainContext'
import Seo from "../components/seo"
import {io} from 'socket.io-client'

import '../styles/common.css'
import MainDataLoading from '../components/mainDataLoading';

function Index(props){
    let { state, post, reload } = React.useContext(mainContext)

    React.useEffect(() => {

        const socket = io('http://localhost:5000');

        // client-side
        socket.on("connect", () => {
            console.log("connected")
            console.log(socket.id); // x8WIv7-mJelg7on_ALbx
        });
        socket.on("disconnect", () => {
            console.log("disconnected")
            console.log(socket.id); // undefined
        });

    }, [])

    return <>
        <p> {state.sessionData.authenticated ? "authenticated" : "--"} </p>
    </>
}

const ChatPage = () => {
  return (
    <>
      <Seo title="chat" />
      <Providers>
        <Index />
      </Providers>
    </>
  )
}

export default ChatPage

