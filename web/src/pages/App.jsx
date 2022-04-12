import * as React from 'react';

import pageRender from '../pageRender/pageRender'
import {AppLayout} from "./AppLayout";
import {AppLogic} from "./AppLogic";


function App(props){
  console.log("APP RERENDER")

  /**
   * DomNode containing the chat. there is no need to maintain
   * the chat state or to query it, so this is the most efficient implementation
   */
  const chatDomNode = React.useRef(null)

  return(
    <>
      <AppLogic chatDomNode={chatDomNode} />
      <AppLayout chatDomNode={chatDomNode} />
    </>
  )
}

pageRender(App)
