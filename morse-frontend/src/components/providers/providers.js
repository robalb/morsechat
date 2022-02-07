import * as React from "react"
import { SnackbarProvider } from 'notistack';
import ApiProvider from './apiProvider'

/*
 * this component wraps all the providers together into one single
 * provider HOC
 *
 */
const Providers = ({children}) => {
 return(
    <SnackbarProvider 
      anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
      }}
      maxSnack={3}
      >
      <ApiProvider>
        {children}
      </ApiProvider>
    </SnackbarProvider>
 )
}

export default Providers

