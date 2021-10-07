import * as React from "react"
import mainContext from '../contexts/mainContext'
import { useAlert } from "react-alert";
import { io } from "socket.io-client";

//init here the websocket, or in components that are child of this component
function MainView(props){
  const rAlert = useAlert();
  const {api, state, setState} = React.useContext(mainContext)

  async function initAppState(setState){
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

  React.useEffect(()=>{
    console.log("useEffect")
    //the page has loaded.
    console.log(state)
    api.setAlert(rAlert)

    initAppState(setState)
  }, [])

  return (
    <h1>main view. loading:{"test"} logged:{state.logged}</h1>
  )
}

export default MainView

