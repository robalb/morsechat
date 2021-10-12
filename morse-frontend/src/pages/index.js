import * as React from "react"
// import { Link } from "gatsby"
// import { StaticImage } from "gatsby-plugin-image"
import Seo from "../components/seo"
import Home from '../components/test'
import Providers from '../components/providers'
import mainContext from '../contexts/mainContext'

import {Container, Paper, Typography} from '@mui/material';
import {FormControl, InputLabel, Select, MenuItem} from '@mui/material';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';

import '../styles/common.css'

const Sidebar = () =>(
<Card elevation={24} sx={{ minWidth: 275 }}>
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
    <Typography variant="body2">
    <ul>
    <li>accounts</li>
    <li> custom callsigns</li>
<li> private rooms </li>
<li>radio rooms, with real time comunications </li>
</ul>
</Typography>
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
  let [room, setRoom] = React.useState()
    return (
  <div className="loaded-index-content">
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
    <Button size="medium" color="secondary" variant="contained">
      Join
    </Button>
  </div>
  )
}

const Index = () => {
  let {state, setState, post} = React.useContext(mainContext)
  
  let mainContent = state.loading ?
    <Loading error={state.error} errorDetails={state.errorDetails}/> :
    <Menu logged={state.logged}/>;

  return (
    <div className="main-container">
      <div className="hero">
      </div>
      <Paper elevation={12} className="index-container">
        {mainContent}
      </Paper>
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
