import * as React from "react"
// import { Link } from "gatsby"
// import { StaticImage } from "gatsby-plugin-image"
import { positions, Provider, useAlert } from "react-alert";
import AlertTemplate from "react-alert-template-basic";

import mainContext from '../contexts/mainContext'
import Seo from "../components/seo"
import Home from '../components/test'
import ApiProvider from '../components/apiProvider'
// import ApiManager from '../utils/apiManager'

//initialize the apiManager class that will be used by every component
// let api = new ApiManager()



const alertTemplateOptions = {
  timeout: 5000,
  position: positions.TOP_RIGHT
};

// the style contains only the margin given as offset
// options contains all alert given options
// message is the alert message
// close is a function that closes the alert
// const AlertTemplate = ({ style, options, message, close }) => (
//   <div style={style}>
//     {options.type === 'info' && '!'}
//     {options.type === 'success' && ':)'}
//     {options.type === 'error' && ':('}
//     {message}
//     <button onClick={close}>X</button>
//   </div>
// )

const IndexPage = () => {

  let [state, setState] = React.useState({
      logged: false,
      loading: true,
      userData: {}
  })

  let [apiState, setApiState] = React.useState({
    csrf: "",
    loading: false
  })


  let mainContextValues = {
    // api,
    state,
    setState
  }

  return (
    <>
      <Seo title="Home" />
      <mainContext.Provider value={mainContextValues}>
      <Provider template={AlertTemplate} {...alertTemplateOptions}>
        <ApiProvider>
        <Home />
        </ApiProvider>
      </Provider>
      </mainContext.Provider>
    </>
  )
}

export default IndexPage
