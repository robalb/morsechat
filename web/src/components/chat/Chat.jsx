import * as React from "react";
import {Button } from '@mui/material';

import styles from './chat.module.css';

import { useSelector, useDispatch } from 'react-redux'

import { fetchAllData } from '../../redux/apiSlice';
import { useSnackbar } from 'notistack';

export function Chat({className = ""}) {
    const { enqueueSnackbar } = useSnackbar();
    const dispatch = useDispatch()
    let {loading, error, errorDetails } = useSelector(state => state.api)

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
    else{
        body = <>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p className={styles.you}><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
        </>
    }

    return (
        <div className={`${styles.chat} ${className}`}>
            {body}
        </div>
    );
}