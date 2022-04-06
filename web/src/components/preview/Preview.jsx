import IconButton from "@mui/material/IconButton";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import * as React from "react";

import styles from './preview.module.css';
import { useSelector, useDispatch } from 'react-redux'
import { resetMessage } from "../../redux/chatSlice";
import getDialect from '../../utils/dialects'

function PreviewInternal(){
    let buffer = useSelector(state => state.chat.messageBuffer)
    let wpm = useSelector(state => state.user.settings.wpm)
    let showReadable = useSelector(state => state.user.settings.show_readable)
    let dialectName = useSelector(state => state.user.settings.dialect)
    let keyDown = useSelector(state => state.chat.keyDown)
    let dialect = getDialect(dialectName)

    let [canTranslateLast, setCanTranslateLast] = React.useState(false)

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

    //this hook starts a countdown that is resetted every time the message buffer updates.
    //if the countodwn reaches the end, a flag that allows the translation of the last letter is set to true
    //and a rerender is triggered, causing the translation of the last letter
    React.useEffect(()=>{
        setCanTranslateLast(false)
        let t = setTimeout(_ => setCanTranslateLast(true), times.letterGap )
        return () =>{
            clearTimeout(t)
        }
    }, [buffer])


    function translateToReadable(letter){
        if(dialect.table.hasOwnProperty(letter))
            return dialect.table[letter];
        return letter;
    }
    // console.log(times)
    function bufferedMorseToString(buffer, times){
        let out = ""
        let down = true;
        let letter = ""
        for(let i=0; i<buffer.length; i++){
            let t = buffer[i]
            //released after t millis
            if(down){
                if(t < times.dash){
                    letter += "."
                }else{
                    letter += "-"
                }
            }
            //pressed after t millis
            else{
                if(t > times.wordGap){
                    if(showReadable) letter = translateToReadable(letter);
                    out += letter + (showReadable ? "" : " ") + "  "
                    letter = ""
                }
                else if(t > times.letterGap){
                    if(showReadable) letter = translateToReadable(letter);
                    out += letter + (showReadable ? "" : " ")
                    letter = ""
                }
            }
            down = !down
        }
        //if there is a letter left, we translate it only if a certain time has passed since the last keypress
        if(showReadable && canTranslateLast && !keyDown)
            return out + translateToReadable(letter);
        return out + (showReadable ? " " : "")+ letter
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