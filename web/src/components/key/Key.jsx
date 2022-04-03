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


  const SPACE_DOT = "space"
  const SPACE_DASH = "space"
  const DOT = "dot"
  const DASH = "dash"

  //start the timer
  React.useEffect(()=>{
    if(!interval.current && (dotDown || dashDown)){
      console.log("starting")
      setTimeout(()=>{
        setYambicEvent(DASH)
      }, 2000)
    }
  }, [dotDown, dashDown])

  //timer stopped
  React.useEffect(()=>{
    console.log("event terminated:")
    console.log(yambicEvent)
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
      yambicDown(isLeft)
    }
  }

  function mouseUp(e){
    if(keyMode === "straight"){
      up()
    }
    else if(keyMode === "yambic"){
      let isLeft = e.nativeEvent.which == 1
      let isDot = (isLeft == leftIsDot) //xor logic operation
      yambicUp(isLeft)
    }
  }

  function down(e){
    console.log("down")
  }

  function up(e){
    console.log("up")
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
