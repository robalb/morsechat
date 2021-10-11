import * as React from "react"


import {request} from '../utils/apiResolver'
import mainContext from '../contexts/mainContext'
import { useSnackbar } from 'notistack';


const ApiProvider = ({children}) => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
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
    // alert.error(error)
    enqueueSnackbar(error, {variant: "error", preventDuplicate:true})
  }


  let mainContextValues = {
    state,
    setState,
    post
  }

 return(
      <mainContext.Provider value={mainContextValues}>
        {children}
      </mainContext.Provider>
 )
}

export default ApiProvider

