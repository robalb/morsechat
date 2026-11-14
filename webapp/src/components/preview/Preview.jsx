import IconButton from "@mui/material/IconButton";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import * as React from "react";

import styles from './preview.module.css';
import { useSelector, useDispatch } from 'react-redux'
import { resetMessage, setTyping, selectShowReadable } from "../../redux/chatSlice";
import getDialect from '../../utils/dialects'
import {send} from '../../redux/chatSlice'
import { wpmToMorseTimes, morseBufferToString } from "../../utils/morse.mjs";
import { analyzeLocalWpm } from "../../utils/wpmDetector.mjs";
import {systemMessage} from '../../utils/chatDom'
import {getInstance} from '../../socket/global.js'

let dashChar = "–" // endash (U+2013)

function formatAutoWpm(analysis){
    if(analysis.maxWpm - analysis.minWpm >= 2)
        return `${analysis.minWpm}–${analysis.maxWpm} WPM`;
    return `~${analysis.currentWpm} WPM`;
}

function TextPreview(){
    let buffer = useSelector(state => state.chat.messageBuffer)
    let wpm = useSelector(state => state.user.settings.wpm)
    let autoDetectWpm = useSelector(state => state.user.settings.auto_detect_wpm)
    let showReadable = useSelector(selectShowReadable)
    let dialectName = useSelector(state => state.user.settings.dialect)
    let dialect = getDialect(dialectName)

    // Recompute the local speed on every buffer change, so the preview follows
    // the user as they key and can decode a message that changes speed.
    let analysis = React.useMemo(
        () => autoDetectWpm ? analyzeLocalWpm(buffer, { fallbackWpm: wpm }) : null,
        [autoDetectWpm, buffer, wpm]
    )
    let units = analysis ? analysis.units : null
    let times = React.useMemo(() => wpmToMorseTimes(wpm), [wpm])

    let [canTranslateLast, setCanTranslateLast] = React.useState(false)

    //this hook starts a countdown that is resetted every time the message buffer updates.
    //the countdown starts only if the last element is a space
    //if the countodwn reaches the end, a flag that allows the translation of the last letter is set to true
    //and a rerender is triggered, causing the translation of the last letter
    React.useEffect(()=>{
        setCanTranslateLast(false)
        let isDown = buffer.length % 2 == 0
        if(isDown)
            return
        // Wait for the local letter gap of the last element, so the preview
        // stays responsive when the user changes speed.
        let lastUnit = units && units.length ? units[units.length - 1] : null
        let letterGap = lastUnit ? lastUnit * 2 : times.letterGap
        let t = setTimeout(_ => setCanTranslateLast(true), letterGap )
        return () =>{
            clearTimeout(t)
        }
    }, [buffer, units, times.letterGap])


    function translateToReadable(letter){
        if(dialect.table.hasOwnProperty(letter))
            return dialect.table[letter];
        return " " + letter + " ";
    }
    let morseString = morseBufferToString(buffer, times, {
        showReadable,
        canTranslateLast,
        translate: translateToReadable,
        unitAt: units ? (i) => units[i] : null,
    }).replaceAll("-", dashChar)

    return <p>{morseString}{autoDetectWpm && analysis && analysis.detections.some(Boolean) && (
        <span className={styles.autoWpm} title="Detected from the timing of your keying; adapts while you type">
            auto {formatAutoWpm(analysis)}
        </span>
    )}</p>
}

function CountdownPreview({emptyBuffer, chatDomNode}){
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

    async function sendMessage(){
      const res = await dispatch(send()).unwrap()
      if(res.error){
        let err = res.payload
        let msg = ""
        //handle error messages
        if(err.error === "too_many_requests"){
          msg = "You are sending too many messages, please wait some seconds"
        }
        else if(err.error === "invalid_message"){
          msg = "You may be using an old version of the website. Try refreshing the page"
        }
        else if(err.error === "unauthorized"){
          msg = "Your session may have expired. Try refreshing the page"
        }
        else{
          msg = err.error + " " + err.details
        }
        systemMessage(chatDomNode, "broadcast failed. " + msg)
      }
      else if(res.training){
        ////
      }
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
            sendMessage()
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

export function Preview({className = "", chatDomNode}) {
    const dispatch = useDispatch()
    let emptyBuffer = useSelector(state => state.chat.messageBuffer.length == 0)

    function clearHandler(e){
        dispatch(resetMessage())
        if(getInstance())
          getInstance().sendTyping(false)
    }
    return (
        <div className={`${styles.preview} ${className}`}>
            <CountdownPreview emptyBuffer={emptyBuffer} chatDomNode={chatDomNode} />
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
