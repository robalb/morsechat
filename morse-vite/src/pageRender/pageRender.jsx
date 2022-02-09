import * as React from 'react';
import ReactDOM from 'react-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import ApiProvider from './apiProvider'
import { SnackbarProvider } from 'notistack';
import './base.css'

export default function render(App){
  ReactDOM.render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
        {/*<CssBaseline />*/}
        <SnackbarProvider 
          anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
          }}
          maxSnack={3}
          >
          <ApiProvider>
            <App />
          </ApiProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </React.StrictMode>,
    document.getElementById('root')
  )
}