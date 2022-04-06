import IconButton from "@mui/material/IconButton";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import * as React from "react";

import styles from './preview.module.css';
import { useSelector, useDispatch } from 'react-redux'
import { resetMessage } from "../../redux/chatSlice";

function PreviewInternal(){
    let buffer = useSelector(state => state.chat.messageBuffer)
    let text = buffer.join(" ")
    return <p>{text}</p>
}

export function Preview({className = ""}) {
    const dispatch = useDispatch()
    let emptyBuffer = useSelector(state => state.chat.messageBuffer.length == 0)
    let width = 20
    let cssWidth = width + "%"
    function clearHandler(e){
        dispatch(resetMessage())
    }
    return (
        <div className={`${styles.preview} ${className}`}>
            <div className={styles.progress} style={{width: cssWidth}}>
            </div>
            <div className={styles.text}>
                <PreviewInternal />
                <IconButton aria-label="cancel message" onClick={clearHandler}
                disabled={emptyBuffer}
                >
                    <DeleteOutlineIcon/>
                </IconButton>
            </div>

        </div>
    );
}