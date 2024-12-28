import * as React from 'react';
import ReactDOM from 'react-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import { SnackbarProvider } from 'notistack';
import './base.css'

import { Provider } from 'react-redux'
import store from '../redux/store'
import {fetchAllData} from '../redux/apiSlice'
import { setChannelByName } from '../redux/chatSlice';

export default function render(App){

  //we are not using the react-redux useDispatch here because this is not a react
  //component. Is this okay? it sure looks efficient. react is not rendered yet, and here
  //we are, already fetching the state data
  store.dispatch(fetchAllData())

    const urlParams = new URLSearchParams(window.location.search);
    const urlChannel = urlParams.get('channel')
    if(urlChannel)
      store.dispatch(setChannelByName(urlChannel))

  ReactDOM.render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
        {/* but no thank you */}
        {/*<CssBaseline />*/}
        <SnackbarProvider 
          anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
          }}
          maxSnack={3}
        >
          <Provider store={store}>
            <App />
          </Provider>
        </SnackbarProvider>
      </ThemeProvider>
    </React.StrictMode>,
    document.getElementById('root')
  )
}