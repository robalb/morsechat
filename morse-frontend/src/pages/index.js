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

const Loading = ({error, errorDetails}) => {
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
      <Button href="/" variant="outlined" color="error">
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

const Menu = ({logged}) => {
  let rooms = [
   "C1", "C2", "C3", "R1", "R2", "R3"
  ]
  let roomsProps = rooms.map(r => 
        <MenuItem value={r} key={r} >{r}</MenuItem>
  )
  let [room, setRoom] = React.useState(rooms[0])
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
        logged={false}
        username={"robalb"}
        handle={"IT000"}
        />

      <ListItemButton component="a" href="#simple-list"
      sx={{  maxWidth: 360, backgroundColor: "#424242"}} dense={true} aria-label="mailbox folders">
            <ListItemAvatar>
              <Avatar>
                <Person/>
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary="Anonymous"
              secondary="IT001"
            />
        <Stack direction="row" alignItems="center" spacing={1}>
          <InfoOutlined />
        </Stack>
      </ListItemButton>

        <Stack direction="row" sx={{padding: "10px"}} alignItems="center" spacing={1}>
          <Button variant="outlined" size="small">Login</Button>
          <Button size="small">Register</Button>
        </Stack>
    <p>--</p>

      <ListItemButton component="a" href="#simple-list"
      sx={{  maxWidth: 360, backgroundColor: "#424242"}} dense={true} aria-label="mailbox folders">
            <ListItemAvatar>
              <Avatar>
                <Person/>
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary="Robalb"
              secondary="IT00HAL"
            />
        <Stack direction="row" alignItems="center" spacing={1}>
          <ManageAccounts />
        </Stack>
      </ListItemButton>

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
            onChange={e => setRoom(e.value)}
          >
            {roomsProps}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} >
        <Button size="medium" color="secondary" variant="contained">
          Join
        </Button>
      </Grid>
    </Grid>
  </div>
  )
}

const Index = () => {
  let {state} = React.useContext(mainContext)
  
  let mainContent = state.loading ?
    <Loading error={state.error} errorDetails={state.errorDetails}/> :
    <Menu logged={state.logged}/>;

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
