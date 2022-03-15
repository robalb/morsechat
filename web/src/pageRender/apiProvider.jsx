import * as React from "react"


import {request, baseApiUrl} from '../utils/apiResolver'
import mainContext from '../contexts/mainContext'
import { useSnackbar } from 'notistack';


const ApiProvider = ({children}) => {

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

  //internal state used by this api provider
  let [fetchCount, setFetchCount] = React.useState(0)

  React.useEffect(()=>{
    console.log("fetching app data. for the "+ fetchCount +" th time in this session")
    //make a raw request, without csrf tokens, to get the initial, essential data required by 
    //any interactive page
    async function getInitData(){
      let url = baseApiUrl + 'page_init'
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
        if(fetchCount > 0)
          alertError(res.error)
        setState( s => ({
          ...s,
          error: res.error,
          errorDetails: res.details
        }) )
      }
    }
    
    getInitData()
    //use this instead of a simple function call to set the whole app in
    //a loading state when the data is reloading
    // setState(
    //   s =>{
    //     getInitData()
    //     return ({
    //       ...s,
    //       loading: true
    //     })
    //   }
    // )
  }, [fetchCount])


  /*
   * api call to a specific api endpoint.
   * will fail if the apiProvider hasn't been initialized.
   * If a component needs to make an api call on mount, it must use an effect
   * to start it only when state.loading == false
   */
  async function post(endpoint, data, silent=false, signal=false){
    //if the csrf token hasn't been initialized yet
    if(state.loading){
        alertError("operation failed, the app has not finished initializing ")
        return {
          success: false,
          error: "network_error",
          details: "api call made before the csrf token was initialized"
        }
    }
    //make request, on fail alert error
    let response = await request(baseApiUrl + endpoint, data, state.sessionData.csrf, signal)
    if(!response.success && !silent)
      alertError("operation failed, please retry. " + response.error)
    return response
  }

  function alertError(error){
    enqueueSnackbar(error, {variant: "error", preventDuplicate:true})
  }

  function reload(data = false){
    if(!data){
      setFetchCount(c => c+1)
    }
    else{
      let newKeys = {}
      if(data.hasOwnProperty('app'))
        newKeys.appData = data.app
      if(data.hasOwnProperty('session'))
        newKeys.sessionData = data.session
      if(data.hasOwnProperty('user'))
        newKeys.userData = data.user

      console.log("newKeys object")
      console.log(newKeys)

      if(Object.values(newKeys).length > 0)
        setState(s => ({
          ...s,
          ...newKeys
        }))
      else
        //fallback to api call update if the received data was malformed
        setFetchCount(c => c+1)
    }
  }


  let mainContextValues = {
    state,
    post,
    reload
  }

 return(
      <mainContext.Provider value={mainContextValues}>
        {children}
      </mainContext.Provider>
 )
}

export default ApiProvider

