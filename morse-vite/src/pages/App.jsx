import * as React from 'react';
import pageRender from '../pageRender/pageRender'

import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

import MainDataLoading from '../components/auth/mainDataLoading'
import LoginForm from '../components/auth/loginForm'
import RegisterForm from '../components/auth/registerForm'
import VerificationForm from '../components/auth/verificationForm'
import mainContext from '../contexts/mainContext'
import {MainIndexForm} from "../components/auth/mainIndexForm";
import {Sidebar} from "../components/index/sidebar";

import './index.css'

export default function App() {
  let {state, post, reload} = React.useContext(mainContext)

  //You may not like it, but this is how peak javascript code is supposed to look like
  let pages = {
    "menu": MainIndexForm,
    "login": LoginForm,
    "register": RegisterForm,
    "verify": VerificationForm
  }
  let [page, _setPage] = React.useState("menu")
  function setPage(pageName){
    if(pages.hasOwnProperty(pageName))
      _setPage(pageName)
  }
  let CurrentPage = pages[page]
  
  let mainContent = state.loading ?
    <MainDataLoading error={state.error} errorDetails={state.errorDetails} reload={reload}/> :
    <CurrentPage state={state} post={post} reload={reload} setPage={setPage}/>;

  return (
    <div className="main-container">
      <div className="hero">
        <Typography variant="h3" color="primary" sx={{
          fontWeight:800
        }}>
          morsechat
        </Typography>
      </div>
      <div className="index-container">
        <div className="index-container-img float1">
        </div>
        <div className="index-container-img float2">
        </div>
        <Paper elevation={12} className="index-container-paper">
          {mainContent}
        </Paper>
      </div>
      <div className="sidebar">
        <Sidebar />
      </div>
    </div>
  )

}


pageRender(App)