import React from 'react';
import Providers from '../components/providers'
import mainContext from '../contexts/mainContext'
import Seo from "../components/seo"

import '../styles/common.css'

function Index(props){
    return <><p>hello</p></>
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

