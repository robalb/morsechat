import * as React from "react";
import {Button } from '@mui/material';

import mainContext from '../../contexts/mainContext'
import styles from './chat.module.css';

export function Chat({className = ""}) {
    let {state, post, reload} = React.useContext(mainContext)

    let body = "";

    if(state.loading && state.error.length > 0){
        body = <div className={styles.loading}>
            <h2>Error: {state.error}</h2>
            <Button onClick={e => reload()} variant="outlined" color="error">
                retry
            </Button>
        </div>
    }
    else if(state.loading){
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