import * as React from "react"
import { useAlert } from "react-alert";

/**
 * this component is a dirty hack that
 * simply pass to its parent the react alert object.
 * i created this because i couldn't find a way to
 * use react alert from the root component, where its provider is defined
 */
const AlertProviderBounce = props =>{
  const alert = useAlert();
  React.useEffect(()=>{
    props.passAlertRef(alert)
  }, [])

  return (<></>)
}

export default AlertProviderBounce

