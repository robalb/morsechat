/**
 *
 */

import * as React from "react"
import { useAlert } from "react-alert";
import mainContext from '../contexts/mainContext'
import {request} from '../utils/apiResolver'

const ApiProvider = ({ children }) => {
  const alert = useAlert();
  let {state, setState} = React.useContext(mainContext)

  let [apiState, setApiState] = React.useState({
    csrf: "",
    loading: false
  })

  let baseUrl = 'http://localhost:5000/api/v1/'

  React.useEffect(()=>{
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
    
  }, [])

  return (
    <>
    {children}
    </>
  )
}

export default ApiProvider
