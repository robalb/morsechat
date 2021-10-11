import * as React from "react"

import { positions, Provider} from "react-alert";
import AlertTemplate from "react-alert-template-basic";
import ApiProvider from './apiProvider'

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

/*
 * this component wraps all the providers toghether into one single
 * provider HOC
 *
 */
const Providers = ({children}) => {
 return(
      <Provider template={AlertTemplate} {...alertTemplateOptions}>
        <ApiProvider>
        {children}
        </ApiProvider>
      </Provider>
 )
}

export default Providers

