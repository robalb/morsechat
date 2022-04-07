import IconButton from "@mui/material/IconButton";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import * as React from "react";

import styles from './preview.module.css';
import { useSelector, useDispatch } from 'react-redux'
import { resetMessage } from "../../redux/chatSlice";
import getDialect from '../../utils/dialects'
import {send} from '../../redux/chatSlice'

function TextPreview(){
    let buffer = useSelector(state => state.chat.messageBuffer)
    let wpm = useSelector(state => state.user.settings.wpm)
    let showReadable = useSelector(state => state.user.settings.show_readable)
    let keyDown = useSelector(state => state.chat.keyDown)
    let dialectName = useSelector(state => state.user.settings.dialect)
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
        return " " + letter + " ";
    }
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
    let morseString = bufferedMorseToString(buffer, times).replaceAll("-", "_")

    return <p>{morseString}</p>
}

function CountdownPreview({emptyBuffer}){
    const dispatch = useDispatch()
    let keyDown = useSelector(state => state.chat.keyDown)
    let submitDelay = useSelector(state => state.user.settings.submit_delay)
    let bar = React.useRef(null)
    let startTime = React.useRef(0)
    let animation = React.useRef(null)

    function setWidth(w){
        if(bar.current)
            bar.current.style.width = w + "%"
    }

    function progressAnimation(){
        let delta = +new Date() - startTime.current
        let multiplier = 1 / (submitDelay)
        let progress = delta * multiplier
        if(progress < 100){
            setWidth(progress)
            animation.current = requestAnimationFrame(progressAnimation)
        }
        else{
            setWidth(0)
            //dispatch send
            dispatch(send())
        }
    }
    React.useEffect(()=>{
        setWidth(0)
        if(!keyDown && !emptyBuffer){
            let t = setTimeout(()=>{
                startTime.current = +new Date()
                animation.current = requestAnimationFrame(progressAnimation)
            }, 600) //completely arbitrary value lol. may cause issues in the future
            return ()=>{
                cancelAnimationFrame(animation.current)
                clearTimeout(t)
            }
        }
    }, [keyDown, emptyBuffer])

    return <div className={styles.progress} ref={bar}> </div>
}

export function Preview({className = ""}) {
    const dispatch = useDispatch()
    let emptyBuffer = useSelector(state => state.chat.messageBuffer.length == 0)

    function clearHandler(e){
        dispatch(resetMessage())
    }
    return (
        <div className={`${styles.preview} ${className}`}>
            <CountdownPreview emptyBuffer={emptyBuffer} />
            <div className={styles.text}>
                <TextPreview />
                <IconButton aria-label="cancel message" onClick={clearHandler}
                disabled={emptyBuffer}
                >
                    <DeleteOutlineIcon/>
                </IconButton>
            </div>

        </div>
    );
}