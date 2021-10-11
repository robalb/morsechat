import * as React from "react"
// import { Link } from "gatsby"
// import { StaticImage } from "gatsby-plugin-image"
import Seo from "../components/seo"
import Home from '../components/test'
import Providers from '../components/providers'
import mainContext from '../contexts/mainContext'

import {Container, Paper, Typography} from '@mui/material';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';

const Index = () => {
  let {state, setState, post} = React.useContext(mainContext)
  let ret = <></>
  if(state.loading){
    ret = <p>Loading</p>
  }
  else{
    if(state.logged){
      ret =<p>logged</p>
    }
    else{
      ret =<p>NOT logged</p>
    }
  }
  return (
    <Container maxWidth={'sm'}>
      <Paper elevation={12}>
          <Typography component="h1" variant="h4" align="center">
            Checkout
          </Typography>
        {ret}
      </Paper>
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
    </Container>
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
