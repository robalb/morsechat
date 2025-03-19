import * as React from "react";
import {Button } from '@mui/material';

import styles from './chat.module.css';

import { useSelector, useDispatch } from 'react-redux'

import { fetchAllData } from '../../redux/apiSlice';
import { useSnackbar } from 'notistack';

import { ReportMessage } from "../report/ReportMessage"; 

export function Chat({className = "", chatDomNode}) {
    const { enqueueSnackbar } = useSnackbar();
    const dispatch = useDispatch()
    const connectionStatus = useSelector(state => state.chat.connectionStatus)
    const channels = useSelector(state => state.chat.channels)
    let showReadable = useSelector(state => state.user.settings.show_readable)
    let {loading, error} = useSelector(state => state.api)
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [selectedMessage, setSelectedMessage] = React.useState(null);

    const handleDialogClose = () => {
      setDialogOpen(false);
      setSelectedMessage(null)
    };

    let randomChannelIndex = Math.floor(Math.random()*channels.length)
    let randomChannel = channels[randomChannelIndex].name

    function handleChatClick(e){
      if(e.target.tagName!="P" && e.target.tagName != "SPAN"){
        return
      }
      let signature = null
      let text = ""
      if(e.target.tagName == "P"){
        signature = e.target.getAttribute("data-signature")
        text = e.target.innerText
      }
      if(!signature && e.target.tagName == "SPAN"){
        signature = e.target.parentNode.getAttribute("data-signature")
        text = e.target.parentNode.innerText
      }
      if(!signature){
        return
      }
      setSelectedMessage({
        signature,
        text
      })
      setDialogOpen(true);
    }

    function reload(){
        dispatch(fetchAllData()).unwrap()
        .catch(e => {
            let error = "Loading failed again"
            enqueueSnackbar(error, {variant: "error", preventDuplicate:true})
        })
    }

    let body = "";
    if(loading && error.length > 0){
        body = <div className={styles.loading}>
            <h2>Error: {error}</h2>
            <Button onClick={e => reload()} variant="outlined" color="error">
                retry
            </Button>
        </div>
    }
    else if(loading){
        body = <div className={styles.loading}>
            <h2>loading</h2>
        </div>
    }
    else if(connectionStatus == "connection denied"){
        body = <div className={styles.info}>
            <h2>Connection denied</h2>
            <p>This channel is for logged users only</p>
        </div>
    }
    else if(connectionStatus == "connection busy"){
        body = <div className={styles.info}>
            <h2>Channel busy</h2>
            <p>There are too many users connected to this channel</p>
            <p>Come back later, or <a href={"/?channel="+randomChannel}>join another channel</a></p>
        </div>
    }
    else if(connectionStatus == "connection failed"){
        body = <div className={styles.info}>
            <h2>Connection failed</h2>
            <p>The connection to this channel failed</p>
        </div>
    }
    else{
        let showReadableStyle = showReadable ? styles.showText: ""
        body = <div ref={chatDomNode} onClick={handleChatClick} className={styles.chatContent + " " + showReadableStyle} > </div>
    }

    return (
      <>
      <div className={`${styles.chat} ${className}`} >
        {body}
      </div>
      <ReportMessage open={dialogOpen} onClose={handleDialogClose} data={selectedMessage} />
      </>
    );
}
