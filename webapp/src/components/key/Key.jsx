import * as React from "react";
import styles from './key.module.css';

import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import {useDispatch, useSelector} from 'react-redux'
import {keyDown, keyUp} from "../../redux/chatSlice";
import {useSound} from "../../hooks/UseSound";


function KeyInternal(props){
  const dispatch = useDispatch()

  let settings = useSelector(state => state.user.settings)
  let keyMode = settings.key_mode
  let wpm = settings.wpm
  let keyVolume = settings.volume_key
  let leftIsDot = settings.left_is_dot
  let keybinds =  settings.keybinds

  //state used by the yambic keyer.
  let [dotDown, setDotDown] = React.useState(false)
  let [dashDown, setDashDown] = React.useState(false)
  let [yambicEvent, setYambicEvent] = React.useState(false)
  const interval = React.useRef(null);
  const dashReleaseTimer = React.useRef(null);

  let [on, off] = useSound(880, keyVolume)


  //handle component leave
  React.useEffect(()=>{
    return function(){
      //cancel yambicLoop
      clearTimeout(interval.current)
      interval.current = null
      //dispatch up
      up()
      console.log("key is unmounting, releasing key to avoid bugs")
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

  /**
   * yambic paddle interface
   * 
   * @param {boolean} isLeft - set the left paddle to down. If false it's the right paddle
   */
  function yambicDown(isLeft){
    let isDot = (isLeft == leftIsDot) //xor logic operation
    // console.log("yambic down")
    if(isDot)
      setDotDown(true)
    else
      setDashDown(true)
  }

  /**
   * yambic paddle interface
   * 
   * @param {boolean} isLeft - set the left paddle to up. If false it's the right paddle
   */
  function yambicUp(isLeft){
    let isDot = (isLeft == leftIsDot) //xor logic operation
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
    //anti-ch3at measure
    if(!e.isTrusted)
      return
    if(keyMode === "straight"){
      down()
    }
    else if(keyMode === "yambic"){
      let isLeft = e.nativeEvent.which == 1
      yambicDown(isLeft)
    }
  }

  function mouseUp(e){
    //anti-ch3at measure
    if(!e.isTrusted)
      return
    if(keyMode === "straight"){
      up()
    }
    else if(keyMode === "yambic"){
      let isLeft = e.nativeEvent.which == 1
      yambicUp(isLeft)
    }
  }

  function down(e){
    //start key sound
    on()
    //dispatch keyDown
    dispatch(keyDown())
    //start up timer, to prevent annoying infinite dashes
    clearTimeout(dashReleaseTimer.current)
    let maxDashTime = 1500 // 2 seconds, which is times[DASH] * 2 at 5 wpm
    dashReleaseTimer.current = setTimeout(up, maxDashTime)
  }

  function up(e){
    //stop key sound
    off()
    //dispatch keyUp
    dispatch(keyUp())
    //reset up timer
    clearTimeout(dashReleaseTimer.current)
  }


  const keyHandler = (e)=>{
    if(keyMode === "straight"){
      if(
        e.key == " " ||
        e.key == keybinds.straight ||
        e.key == keybinds.yambic_left ||
        e.key == keybinds.yambic_right
      )
        if(e.event == "up")
          up()
        else
          down()
    }
    else{
      let isLeft = e.key == keybinds.yambic_left
      let isRight = e.key == keybinds.yambic_right
      if(isLeft || isRight)
        if(e.event == "up")
          yambicUp(isLeft)
        else
          yambicDown(isLeft)
    }
  }

  const downHandler = (e) =>{
    //anti-ch3at measure
    if(!e.isTrusted)
      return
    keyHandler({
      key: e.key,
      event: "down"
    })
  }
  const upHandler = (e) => {
    //anti-ch3at measure
    if(!e.isTrusted)
      return
    keyHandler({
      key: e.key,
      event: "up"
    })
  };

  // add key events event listeners
  // this is where the code gets ugly:
  // the listeners, and every other function that is called by them will keep
  // a binding to the current state at the time of their declaration.
  // in a react component with many state updates, this is bad because
  // accessing the state from within one of those functions will return the state
  // at the time of the addEventListener execution
  // The naiive solution is to navigate the tree of funcalls that start from
  // these listeners, and manually add every reactive element to the useEffect dependencies
  // This is slow, and a sign that a refactor was needed long ago
  React.useEffect(() => {
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);
    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, [settings, up, down]);

  return (
    <button className={styles.key_bt}
      onTouchStart={e => {
        e.stopPropagation();
        e.preventDefault();
        down()
      }}
      onTouchEnd={e => {
        e.stopPropagation();
        e.preventDefault();
        up()
      }}
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
