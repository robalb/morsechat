import * as React from "react"
import { Link } from "gatsby"
import { StaticImage } from "gatsby-plugin-image"
import { positions, Provider } from "react-alert";
// import AlertTemplate from "react-alert-template-basic";

import mainContext from '../contexts/mainContext'
import MainView from "../components/mainView"
import Seo from "../components/seo"

import ApiManager from '../utils/apiManager'
let api = new ApiManager()
async function test(){
  await new Promise(resolve => setTimeout(resolve, 2000));
  let resp = await api.post('login', {})
  console.log(resp)
}
test()
//TODO: connect api to a contextProvider

// import { io } from "socket.io-client";
const options = {
  timeout: 5000,
  position: positions.TOP_RIGHT
};

// the style contains only the margin given as offset
// options contains all alert given options
// message is the alert message
// close is a function that closes the alert
const AlertTemplate = ({ style, options, message, close }) => (
  <div style={style}>
    {options.type === 'info' && '!'}
    {options.type === 'success' && ':)'}
    {options.type === 'error' && ':('}
    {message}
    <button onClick={close}>X</button>
  </div>
)

const IndexPage = () => {
  React.useEffect(()=>{
    //the page has loaded.
  }, [])

  let mainContextValues = {
    api: api
  }

  return (
    <>
      <Seo title="Home" />
      <mainContext.Provider value={mainContextValues}>
      <Provider template={AlertTemplate} {...options}>
        <MainView />
      </Provider>
      </mainContext.Provider>
    </>
  )
}

export default IndexPage
