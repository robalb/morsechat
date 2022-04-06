import IconButton from "@mui/material/IconButton";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import * as React from "react";

import styles from './preview.module.css';
import { useSelector, useDispatch } from 'react-redux'
import { resetMessage } from "../../redux/chatSlice";

function PreviewInternal(){
    let buffer = useSelector(state => state.chat.messageBuffer)
    let wpm = useSelector(state => state.user.settings.wpm)


    //TODO: abstract this into some sort of reusable function and put it somewhere else
    function getTimes(wpm){
        if(wpm < 1) wpm = 1
        if(wpm > 200) wpm = 200
        const dotTime = Math.ceil(1200 / wpm)
        return {
            dot: dotTime,
            dash: dotTime * 3,
            elementGap: dotTime,
            letterGap: dotTime * 3,
            wordGap: dotTime * 7
        }
    }
    let times = getTimes(wpm)
    // console.log(times)
    function bufferedMorseToString(buffer, times){
        let out = ""
        let down = true;
        let word = ""
        for(let i=0; i<buffer.length; i++){
            // console.log("--- " + i)
            let t = buffer[i]
            //released after t millis
            if(down){
                // console.log("released after " + t)
                if(t < times.dash){
                    word += "."
                }else{
                    word += "_"
                }
            }
            //pressed after t millis
            else{
                // console.log("pressed after " + t)
                if(t > times.wordGap){
                    out+= word + "   "
                    word = ""
                }
                else if(t > times.letterGap){
                    out += word + " "
                    word = ""
                }
                else{
                    out += ""
                }
            }
            down = !down
        }
        return out + word
    }
    let morseString = bufferedMorseToString(buffer, times)

    return <p>{morseString}</p>
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