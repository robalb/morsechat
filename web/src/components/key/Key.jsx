import * as React from "react";
import styles from './key.module.css';

import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { useSelector, useDispatch } from 'react-redux'
import { keyDown, keyUp } from "../../redux/chatSlice";

function useSound(note=880, volume=100){
  //setting the gain to zero crashes everything, this is a workaround
  const baseVolume = 0.0000001
  if(volume < 0) volume = 0
  if(volume > 100) volume = 100
  volume = (volume + baseVolume) / 100

  let [ctx, setCtx] = React.useState(null)
  let [o, setO] = React.useState(null)
  let [g, setG] = React.useState(null)

  let [isOn, setIsOn] = React.useState(false)
  let [initialized, setInitialized] = React.useState(false)

  //update the volume in real time if it changes while the sound is playing
  React.useEffect(()=>{
    if(isOn){
      console.log("UPDATING REALTIME KEY VOLUME")
      g.gain.setValueAtTime(
        volume, ctx.currentTime
      )
    }
  }, [volume])

  //initialize the audio context - in chrome this will throw a warning
  //because apparently an user action is required but it still works
  React.useEffect(()=>{
    console.log("AUDIO NODE CREATED")
    //https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
    let context = new AudioContext()
    context.suspend()
    let o = context.createOscillator()
    o.frequency.value = note
    o.type = "triangle"
    let g = context.createGain()
    o.connect(g)
    g.connect(context.destination)
    setCtx(context)
    setO(o)
    setG(g)
    console.log(context)

    return ()=>{
      console.log("CLOSING AUDIO CTX")
      ctx.close()
    }
  },[])

  return [
    function on(){
      if(!initialized){
        ctx.resume()
        o.start()
        setInitialized(true)
      }
      if(g){
        setIsOn(true)
        g.gain.setValueAtTime(
          volume, ctx.currentTime
        )
      }
    },
    function off(){
      if(initialized && g){
        setIsOn(false)
        g.gain.setValueAtTime(
          baseVolume, ctx.currentTime
        )
      }
    }
  ]
}

function KeyInternal(props){
  const dispatch = useDispatch()

  let keyMode = useSelector(state => state.user.settings.key_mode)
  let wpm = useSelector(state => state.user.settings.wpm)
  let keyVolume = useSelector(state => state.user.settings.volume_key)
  let leftIsDot = useSelector(state => state.user.settings.left_is_dot)
  //Apparently by using this & similar tricks we don't need callbacks for the send system:
  //we can just have a selector countowntime that is zero if we are not countig down,
  //and > 0 incrementing each tick if we are indeed counting down
  //no timers means that we can call send message whenever we want, such as here
  //when we detect settings changes, or directly in redux
  // let countingDown = useSelector(state => {
  //   let chat = state.chat
  //   return chat.lastTime > 0 && 
  //     chat.keyDown == false &&
  //     (+new Date() - chat.lastTime) > 100 //calculate from settings
  // })

  // console.log(countingDown)

  //state used by the yambic keyer.
  let [dotDown, setDotDown] = React.useState(false)
  let [dashDown, setDashDown] = React.useState(false)
  let [yambicEvent, setYambicEvent] = React.useState(false)
  const interval = React.useRef(null);

  let [on, off] = useSound(880, keyVolume)
  //TODO: move this logic in the display component
  //we can always detect if we are in a countdown state by listening to 
  //chatslice.keYdown==false && chatSlice.lastTime > X
  // const sendInterval = React.useRef(null);

  // function cancelSendInterval(){
  //   clearTimeout(sendInterval.current)
  //   sendInterval.current = null
  // }
  // function startSendInterval(){
  //   cancelSendInterval()
  //   sendInterval.current = setTimeout(()=>{
  //    //dispatch send
  //}, waitTime)
  // }

  //stop the yambic loop if there are settings changes
  //while it's running, to avoid bugs
  React.useEffect(()=>{
    if(interval.current){
      up()
      clearTimeout(interval.current)
      interval.current = null
      console.log("settings changed, releasing key to avoid bugs")
    }
  }, [keyMode, wpm, leftIsDot])


  //handle component leave
  React.useEffect(()=>{
    return function(){
      //cancel yambicLoop
      clearTimeout(interval.current)
      interval.current = null
      //dispatch up
      up()
    }
  }, [])


  //the space after a dot
  const SPACE_DOT = "space_dot"
  //the space after a dash
  const SPACE_DASH = "space_dash"
  const DOT = "dot"
  const DASH = "dash"
  
  //TODO: put this in a function somewhere accessible, maybe in a selector
  function getTimes(wpm){
    if(wpm < 1) wpm = 1
    if(wpm > 200) wpm = 200
    const dotTime = Math.ceil(1200 / wpm)
    return {
      [SPACE_DOT]: dotTime,
      [SPACE_DASH]: dotTime,
      [DOT]: dotTime,
      [DASH]: dotTime * 3
    }
  }
  const times = getTimes(wpm)



  function scheduleYambicEvent(event){
    if(interval.current){
      console.warn("WARNING weird state: setting timer while another is running")
    }
    else{
      interval.current = setTimeout(()=>{ setYambicEvent(event) }, times[event])
    }
  }

  //start the timer
  React.useEffect(()=>{
    if(!interval.current){
      if(dotDown && dashDown){
        console.warn("WARNING weird state: bot dot and dash down, no interval running")
      }
      else if(dotDown){
        down()
        scheduleYambicEvent(DOT)
      }
      else if(dashDown){
        down()
        scheduleYambicEvent(DASH)
      }
    }
  }, [dotDown, dashDown])


  //react to a yambic event end
  React.useEffect(()=>{
    // console.log(yambicEvent)
    interval.current = null
    //one of the following events has terminated
    if(yambicEvent === DOT){
      up()
      scheduleYambicEvent(SPACE_DOT)
    }
    else if(yambicEvent === DASH){
      up()
      scheduleYambicEvent(SPACE_DASH)
    }
    else{
      if(dotDown && dashDown){
        down()
        const alternate = (yambicEvent == SPACE_DASH ? DOT : DASH)
        scheduleYambicEvent(alternate)
      }
      else if(dotDown){
        down()
        scheduleYambicEvent(DOT)
      }
      else if(dashDown){
        down()
        scheduleYambicEvent(DASH)
      }

    }
  }, [yambicEvent])

  function yambicDown(isDot){
    // console.log("yambic down")
    if(isDot)
      setDotDown(true)
    else
      setDashDown(true)
  }

  function yambicUp(isDot){
    // console.log("yambic up")
    if(isDot)
      //idea: set the down state as a integer with 3 values: 0,1,2 isntead of a bool.
      //we consider down something that is not 0,
      //yambic up sets to 1 (careful: sets, not decrement: decrementing causes raceconditions)
      //the scheduler sets to zero or to 2
      //this should solve the "key must stay pressed until scheduler sees it"
      setDotDown(false)
    else
      setDashDown(false)
  }

  function mouseDown(e){
    if(keyMode === "straight"){
      down()
    }
    else if(keyMode === "yambic"){
      let isLeft = e.nativeEvent.which == 1
      let isDot = (isLeft == leftIsDot) //xor logic operation
      yambicDown(isDot)
    }
  }

  function mouseUp(e){
    if(keyMode === "straight"){
      up()
    }
    else if(keyMode === "yambic"){
      let isLeft = e.nativeEvent.which == 1
      let isDot = (isLeft == leftIsDot) //xor logic operation
      yambicUp(isDot)
    }
  }

  function down(e){
    // console.log(">>down")
    on()
    dispatch(keyDown())
  }

  function up(e){
    // console.log(">>up")
    off()
    dispatch(keyUp() )
  }


  return (
    <button className={styles.key_bt}
      onTouchStart={down}
      onTouchEnd={up}
      onMouseDown={mouseDown}
      onMouseUp={mouseUp}
      onContextMenu={e => e.preventDefault()}
    >-</button>
  )

}

export function Key({className = "", leftButton, sheetBtHandler}) {
    if(leftButton === undefined){
        //this is an invisible left button; it's purpose is to take the space
        //in the flex layout when there are no real defined left buttons
        leftButton = (
            <IconButton className={styles.settings_invisible} aria-label="disabled button">
              <SettingsIcon />
            </IconButton>
        )
    }
    return (
        <div className={`${styles.key} ${className}`}>

            {leftButton}

            <KeyInternal />

            <IconButton aria-label="morse table" onClick={sheetBtHandler}>
              <LibraryBooksIcon />
            </IconButton>
        </div>
    );
}
