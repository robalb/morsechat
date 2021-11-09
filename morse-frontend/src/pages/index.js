import * as React from "react"
// import { Link } from "gatsby"
import { StaticImage } from "gatsby-plugin-image"
import Seo from "../components/seo"
import Home from '../components/test'
import CurrentUserChip from '../components/currentUserChip'
import MainDataLoading from '../components/mainDataLoading'
import LoginForm from '../components/loginForm'
import RegisterForm from '../components/registerForm'
import VerificationForm from '../components/verificationForm'
import Providers from '../components/providers'
import mainContext from '../contexts/mainContext'

import {Paper, Typography, Grid} from '@mui/material';
import {FormControl, InputLabel, Select, MenuItem, Link} from '@mui/material';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import InboxIcon from '@mui/icons-material/Inbox';
import ListItemButton from '@mui/material/ListItemButton';
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
      Join the discord community to get the latest updates on the project and
      participate on its development.
    </Typography>
    <Typography variant="body2">
      This project is open source. View its full source on github
    </Typography>

        <List>
          <ListItem dense={true} disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <InboxIcon />
              </ListItemIcon>
              <ListItemText primary="discord server" />
            </ListItemButton>
          </ListItem>
          <ListItem dense={true} disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <InboxIcon />
              </ListItemIcon>
              <ListItemText primary="github" />
            </ListItemButton>
          </ListItem>
          <ListItem dense={true} disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <InboxIcon />
              </ListItemIcon>
              <ListItemText primary="halb.it" />
            </ListItemButton>
          </ListItem>
          <ListItem dense={true} disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <InboxIcon />
              </ListItemIcon>
              <ListItemText primary="twitter" />
            </ListItemButton>
          </ListItem>
        </List>
    <Typography variant="h5" >
      Report an issue
    </Typography>
    <Typography variant="body2">
      Bug reports are always welcome! you can 
      <Link href="#" color="primary" variant="inherit" underline="always"> Open an issue </Link>
      on github or write in the 'bugs' section on the
      <Link href="#" color="primary" variant="inherit" underline="always"> Discord server </Link>
    </Typography>
    <Typography variant="h5" >
    What's new
    </Typography>
    <Typography variant="h6" color="text.secondary">
    v 0.1
    </Typography>
    <Typography variant="body2">
    [md parse failed]
    </Typography>
</CardContent>
</Card>
)

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
  <>
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
  </>
  )
}

//define the layout of the index page, and in the main container
//shows either a loading status, or the menu/login/register pages
const Index = () => {
  let {state, post, reload} = React.useContext(mainContext)

  //You may not like it, but this is how peak javascript code is supposed to look like
  let pages = {
    "menu": IndexMenu,
    "login": LoginForm,
    "register": RegisterForm,
    "verify": VerificationForm
  }
  let [page, _setPage] = React.useState("register")
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
