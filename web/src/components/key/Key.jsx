import * as React from "react";
import styles from './key.module.css';

import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { useSelector, useDispatch } from 'react-redux'

function KeyInternal(props){
  const dispatch = useDispatch()

  let keyMode = useSelector(state => state.user.settings.key_mode)

  //TODO: make this an actual global setting
  let leftIsDot = true
  let yambicVariantIsA = true

  let [dotDown, setDotDown] = React.useState(false)
  let [dashDown, setDashDown] = React.useState(false)
  let [yambicEvent, setYambicEvent] = React.useState(false)

  const interval = React.useRef(null);

  React.useEffect(()=>{
    //stop the yambic loop if there are settings changes
    //while it's running
    
  }, [keyMode])


  //handle component leave
  React.useEffect(()=>{
    return function(){
      //cancel yambicLoop
      //dispatch up
    }
  }, [])


  //the space after a dot
  const SPACE_DOT = "space_dot"
  //the space after a dash
  const SPACE_DASH = "space_dash"
  const DOT = "dot"
  const DASH = "dash"
  
  //TODO: get this from the settings
  const times = {
    [SPACE_DOT]: 500,
    [SPACE_DASH]: 500,
    [DOT]: 500,
    [DASH]: 1500
  }

  function scheduleYambicEvent(event){
    if(interval.current){
      console.log("WARNING weird state: setting timer while another is running")
    }
    else{
      interval.current = setTimeout(()=>{ setYambicEvent(event) }, times[event])
    }
  }

  //start the timer
  React.useEffect(()=>{
    console.log("starting")
    if(!interval.current){
      if(dotDown && dashDown){
        console.log("WARNING weird state: bot dot and dash down, no interval running")
      }
      else if(dotDown){
        down()
        interval.current = setTimeout(()=>{ setYambicEvent(DOT) }, times[DOT])
      }
      else if(dashDown){
        down()
        interval.current = setTimeout(()=>{ setYambicEvent(DASH) }, times[DASH])
      }
    }
  }, [dotDown, dashDown])


  //react to a timer stop
  React.useEffect(()=>{
    // console.log("event terminated:")
    console.log(yambicEvent)
    interval.current = null
    //one of the following events has terminated
    if(yambicEvent === DOT){
      up()
      interval.current = setTimeout(()=>{ setYambicEvent(SPACE_DOT) }, times[SPACE_DOT])
    }
    else if(yambicEvent === DASH){
      up()
      interval.current = setTimeout(()=>{ setYambicEvent(SPACE_DASH) }, times[SPACE_DASH])
    }
    else{
      if(dotDown && dashDown){
        down()
        const alternate = (yambicEvent == SPACE_DASH ? DOT : DASH)
        interval.current = setTimeout(()=>{ setYambicEvent(alternate) }, times[alternate])
      }
      else if(dotDown){
        down()
        interval.current = setTimeout(()=>{ setYambicEvent(DOT) }, times[DOT])
      }
      else if(dashDown){
        down()
        interval.current = setTimeout(()=>{ setYambicEvent(DASH) }, times[DASH])
      }

    }
  }, [yambicEvent])

  function yambicDown(isDot){
    console.log("yambic down")
    if(isDot)
      setDotDown(true)
    else
      setDashDown(true)
  }

  function yambicUp(isDot){
    console.log("yambic up")
    if(isDot)
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
    console.log(">>down")
  }

  function up(e){
    console.log(">>up")
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
