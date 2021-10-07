import * as React from "react"
import mainContext from '../contexts/mainContext'
// import { useAlert } from "react-alert";
// import { io } from "socket.io-client";

//init here the websocket, or in components that are child of this component
function TestComp(props){
  // const rAlert = useAlert();
  const {api, state, setState} = React.useContext(mainContext)


  React.useEffect(()=>{
    async function initAppState(){
      console.log("initAppState")
      let resp = await api.post('user', {})
      console.log(resp)
      if(resp.success){
        setState( state => ({
          ...state,
          logged: resp.data.logged,
          loading: false
        }) )
      }
    }
    console.log("useEffect")
    //the page has loaded.
    console.log(state)
    // api.setAlert(rAlert)
    initAppState()
  }, [])

  return (
    <h1>main view.asd loading:{state.loading ? 1 : 0} logged:{state.logged ? 1 : 0}</h1>
  )
}

export default TestComp

