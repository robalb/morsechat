import * as React from "react"
// import { Link } from "gatsby"
import { StaticImage } from "gatsby-plugin-image"
import Seo from "../components/seo"
import Home from '../components/test'
import CurrentUserChip from '../components/currentUserChip'
import Providers from '../components/providers'
import mainContext from '../contexts/mainContext'

import {Paper, Typography, Grid} from '@mui/material';
import {FormControl, InputLabel, Select, MenuItem} from '@mui/material';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';


import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';

import {ManageAccounts, Person, InfoOutlined} from '@mui/icons-material';

import '../styles/common.css'

//part of the layout
//TODO: enhance with content from graphQL (md file for ex.)
const Sidebar = () =>(
<Card elevation={12} sx={{ minWidth: 275 }}>
    <CardContent>
    <Typography variant="h5" >
    Community
    </Typography>
    <Typography variant="body2">
    follow the development on Discord
    </Typography>
    <Typography variant="h5" >
    What's new
    </Typography>
    <Typography variant="h6" color="text.secondary">
    v 0.1
    </Typography>
    <Typography variant="body2">
    This is a rewrite of the old halb.it/morsecode website, that implements:
    </Typography>
    <ul>
    <li>accounts</li>
    <li> custom callsigns</li>
<li> private rooms </li>
<li>radio rooms, with real time comunications </li>
</ul>
</CardContent>
</Card>
)

//TODO: move to dedicated file
const MainDataLoading = ({error, errorDetails, reload}) => {
  let content = error.length > 0 ?
    <>
      <Typography color="error" variant="h6">
       Loading error
      </Typography>
      <Typography variant="body2">
       Error code: {error}
      </Typography>
      <Typography variant="body2">
      {errorDetails}
      </Typography>
      <Button onClick={reload} variant="outlined" color="error">
        retry
      </Button>
    </>
      :
    <>
      <Typography variant="body2">
      Loading account data
      </Typography>
      <LinearProgress color="secondary" />
    </>
    
  return (
  <div className="loading">
  <div className="message">
    {content}
  </div>
  </div>
  )
}

//TODO: move to dedicated file
const LoginForm = ({state, reload, setPage, post}) =>{
  let [form, setForm] = React.useState({

  })
  return <p>login</p>
}
//TODO: move to dedicated file
const RegisterForm = ({state, reload, setPage, post}) =>{
  let [form, setForm] = React.useState({

  })
  return <p>register</p>
}

const IndexMenu = ({state, reload, setPage, post}) => {
  //semplify data extraction from the state object
  let logged = state.sessionData.authenticated
  //generate rooms list, and handle room state
  let rooms = []
  for(let i=0; i< state.appData.rooms.chat; i++)
    rooms.push("chat" + i)
  for(let i=0; i< state.appData.rooms.radio; i++)
    rooms.push("radio" + i)
  let roomsProps = rooms.map(r => 
        <MenuItem value={r} key={r} >{r}</MenuItem>
  )
  let [room, setRoom] = React.useState(rooms[0])
  let roomUrl = "/rooms/chat/"+room

  //activate the join button when the nopopup request complete (TODO: remove
  //completely this request, and set the flag serverside, or do it silently without disabling
  //the button)
  React.useEffect(()=>{
    async function setNoPopup(){
      let res = await post("no_popup", {})
    }
    if(state.sessionData.show_popup){
      setNoPopup()
    }
  }, [])

  return (
  <div className="loaded-index-content">
    <Grid container spacing={3}>
      <Grid item xs={12} >
        <Typography variant="h5" color="primary" >
          Account
        </Typography>
      </Grid>
      <Grid item xs={12} >

      <CurrentUserChip
        logged={logged}
        username={logged && state.userData.username}
        callSign={state.userData.callsign}
        />
        { !logged && (
          <Stack direction="row" sx={{padding: "10px"}} alignItems="center" spacing={1}>
            <Button variant="outlined" size="small" onClick={e => setPage("login")}>Login</Button>
            <Button size="small" onClick={e => setPage("register")}>Register</Button>
          </Stack>
        ) }

      </Grid>
      <Grid item xs={12} >
        <Divider />
      </Grid>
      <Grid item xs={12} >
        <Typography variant="h5" color="primary" >
          channel
        </Typography>
      </Grid>
      <Grid item xs={12} >
        <FormControl fullWidth size="small" >
          <InputLabel id="demo-simple-select-label">Select channel</InputLabel>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={room}
            label="Select channel"
            onChange={e => setRoom(e.target.value)}
          >
            {roomsProps}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} >
        <Button size="medium" href={roomUrl} color="secondary" variant="contained">
          Join
        </Button>
      </Grid>
    </Grid>
  </div>
  )
}

//define the layout of the index page, and in the main container
//shows either a loading status, or the menu/login/register pages
const Index = () => {
  let {state, post, reload} = React.useContext(mainContext)

  //You may not like it, but this is how javascript code is supposed to look like
  let pages = {
    "menu": IndexMenu,
    "login": LoginForm,
    "register": RegisterForm
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
          morsecode
        </Typography>
      </div>
      <div className="index-container">
        <div className="index-container-img float1">
          <StaticImage
               className="static-image"
               src="../images/circuit.png"
               alt=""
               placeholder="blurred"
               layout="fixed"
               width={800}
             />
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

const IndexPage = () => {
  return (
    <>
      <Seo title="Home" />
      <Providers>
        <Index />
      </Providers>
    </>
  )
}

export default IndexPage
