import * as React from "react";
import {Button } from '@mui/material';

import styles from './chat.module.css';

import { useSelector, useDispatch } from 'react-redux'

import { fetchAllData } from '../../redux/apiSlice';
import { useSnackbar } from 'notistack';

export function Chat({className = "", chatDomNode}) {
    const { enqueueSnackbar } = useSnackbar();
    const dispatch = useDispatch()
    const connectionStatus = useSelector(state => state.chat.connectionStatus)
    let showReadable = useSelector(state => state.user.settings.show_readable)
    let {loading, error} = useSelector(state => state.api)

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
    else if(connectionStatus == "connection failed"){
        body = <div className={styles.info}>
            <h2>Connection failed</h2>
            <p>The connection to this channel failed</p>
        </div>
    }
    else{
        let showReadableStyle = showReadable ? styles.showText: ""
        body = <div ref={chatDomNode} className={styles.chatContent + " " + showReadableStyle} > </div>
    }

    return (
        <div className={`${styles.chat} ${className}`} >
            {body}
        </div>
    );
}