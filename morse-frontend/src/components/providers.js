import * as React from "react"

import { positions, Provider} from "react-alert";
import AlertTemplate from "react-alert-template-basic";

import {request} from '../utils/apiResolver'
import mainContext from '../contexts/mainContext'
import AlertProviderBounce from './alertProviderBounce'

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

const Providers = ({children}) => {
  /*
   * the main app state
   */
  let [state, setState] = React.useState({
      logged: false,
      loading: true,
      userData: {}
  })

  React.useEffect(()=>{
    alertError("asd asdas")
  }, [])


  //internal states
  let [apiState, setApiState] = React.useState({
    csrf: ""
  })
  let [alertState, setAlertState] = React.useState({
    alertRef: false,
    queque: []
  })
  //TODO: work on this hardcoded url
  let baseUrl = 'http://localhost:5000/api/v1/'

  /*
  * makes a special api call to the backend to get the csrf protection token,
  * and stores it in the apiState
  */
  async function initCsrfToken(){
    let url = baseUrl + 'csrf'
    let call = await request(url, {})
    if( call.success && call.data.token )
      setApiState(state => ({
        ...state,
        csrf: call.data.token
      }))
    else
      console.log("csrfToken init failed")
    return call
  }
  /*
   * api call to a specific api endpoint
   * init the csrf token if not set
   */
  async function post(endpoint, data){
    let csrf = apiState.csrf
    //if the csrf token hasn't been initialized yet
    if(csrf.length == 0){
      let initCall = await initCsrfToken()
      if(!initCall.success){
        alertError("operation failed, please retry. " + initCall.error)
        return {
          success: false,
          error: "csrf_init_failed",
          details: initCall.details
        }
      }
      else{
        csrf = initCall.data.token
      }
    }
    //make request, on fail alert error
    let response = await request(baseUrl + endpoint, data, csrf)
    if(!response.success)
      alertError("operation failed, please retry. " + response.error)
    return response
  }

  function alertError(error){
    setAlertState(s => {
      let newQueque = s.queque
      if(s.alertRef){
        s.alertRef.error(error)
      }else{
        newQueque.push(error)
      }
      return {...s, queque:newQueque}

    })
  }
  function setAlertRef(ref){
    if(alertState.alertRef == false)
      setAlertState(s =>{
        if(s.queque.length > 0){
          s.queque.forEach(msg => ref.errror(msg))
        }
        return {
          ...s,
          alertRef: ref,
          queque: []
        }
      })
  }


  let mainContextValues = {
    state,
    setState,
    post
  }

 return(
      <mainContext.Provider value={mainContextValues}>
      <Provider template={AlertTemplate} {...alertTemplateOptions}>
        <AlertProviderBounce passAlertRef={setAlertRef}></AlertProviderBounce>
        {children}
      </Provider>
      </mainContext.Provider>
 )
}

export default Providers

