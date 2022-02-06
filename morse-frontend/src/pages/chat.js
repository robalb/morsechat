import React from 'react';
import Providers from '../components/providers/providers'
import mainContext from '../contexts/mainContext'
import Seo from "../components/seo"
import {io} from 'socket.io-client'

import Card from "@mui/material/Card";

import '../styles/common.css'
import '../styles/chat.css'

function authPopup(props){

}

function Navbar(props){
  return (
    <Card elevation={5} >
      <h1>title</h1>
    </Card>
  )
}

function Chat(props){
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
    <Navbar />
    <h1>hello</h1>
        <p> {state.sessionData.authenticated ? "authenticated" : "--"} </p>
    </>
}

const ChatPage = () => {
  return (
    <>
      <Seo title="chat" />
      <Providers>
        <Chat />
      </Providers>
    </>
  )
}

export default ChatPage

