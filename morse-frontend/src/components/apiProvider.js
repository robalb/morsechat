import * as React from "react"


import {request} from '../utils/apiResolver'
import mainContext from '../contexts/mainContext'
import { useSnackbar } from 'notistack';


const ApiProvider = ({children}) => {
  //TODO: work on this hardcoded url
  let baseUrl = 'http://localhost:5000/api/v1/'
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  /*
   * the main app state, containing essential application data
   */
  let [state, setState] = React.useState({
      //state of the data fetch
      loading: true,
      error: "",
      errorDetails: "",
      //the data that must be fetched
      //WARNING: this data can't be used if loading == true
      userData: {},
      sessionData: {},
      appData: {}
  })

  React.useEffect(()=>{
    //make a raw request, without csrf tokens, to get the initial, essential data required by 
    //any interactive page
    async function getInitData(){
      let url = baseUrl + 'page_init'
      let res = await request(url, {}) 
      if(res.success){
        setState( s => ({
          ...s,
          loading: false,
          appData: res.data.app,
          sessionData: res.data.session,
          userData: res.data.user
        }) )
      }
      else{
        setState( s => ({
          ...s,
          error: res.error,
          errorDetails: res.details
        }) )
      }
    }
    getInitData()
  }, [])


  /*
   * api call to a specific api endpoint.
   * will fail if the apiProvider hasn't been initialized.
   * If a component needs to make an api call on mount, it must use an effect
   * to start it only when state.loading == false
   */
  async function post(endpoint, data, silent=false){
    //if the csrf token hasn't been initialized yet
    if(state.loading){
        alertError("operation failed, the app has not finished initializing ")
        return {
          success: false,
          error: "csrf_init_failed",
        }
    }
    //make request, on fail alert error
    let response = await request(baseUrl + endpoint, data, state.sessionData.csrf)
    if(!response.success && !silent)
      alertError("operation failed, please retry. " + response.error)
    return response
  }

  function alertError(error){
    enqueueSnackbar(error, {variant: "error", preventDuplicate:true})
  }


  let mainContextValues = {
    state,
    post
  }

 return(
      <mainContext.Provider value={mainContextValues}>
        {children}
      </mainContext.Provider>
 )
}

export default ApiProvider

