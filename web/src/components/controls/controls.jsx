import Select from "@mui/material/Select";
import * as React from "react";
import Slider from '@mui/material/Slider';
import MenuItem from '@mui/material/MenuItem';
import { useSelector, useDispatch } from 'react-redux'
import { updateSettings } from "../../redux/userSlice";
import styles from './controls.module.css';
import { useSnackbar } from 'notistack';

import { useStateDep } from "../../hooks/useStateDep";
import { Switch } from "@mui/material";

import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';

import {dialects} from '../../utils/dialects'
/**
 * TODO: rename this file and its parent folder into controls
 */

/**
 * this complicated contraption is here to prevent a rerender of every slider
 * every time there is a settings change.
 * Additionally, for optimal performance onChangeCommitted must be passed through useCallback
 */
const MemoSlider = React.memo(function CustomSlider({value, onChangeCommitted, ...props}){
    let [val, setVal] = useStateDep(value)
    return <Slider value={val} 
                onChange={e=>{ setVal(e.target.value) }}
                onChangeCommitted={onChangeCommitted}
                {...props} />
})

const MemoSwitch = React.memo(Switch)

export function SideControls({className = "", settingsButton=""}) {
    const {enqueueSnackbar} = useSnackbar();
    const dispatch = useDispatch()
    let settings = useSelector(state => state.user.settings)

    function update(data) {
        dispatch(updateSettings(data)).unwrap()
            // .then(e => {
            //     if (e.type == "api/call/rejected")
            //         enqueueSnackbar("your settings could not be saved " + e.payload.error, { variant: "error", preventDuplicate: true })
            // })
            .catch(e => { })
    }

    return (
        <div className={`${styles.controls} ${className}`}>
            <h2>Controls</h2>
            <p>wpm</p>
            <MemoSlider size="small" value={settings.wpm} aria-label="Default" valueLabelDisplay="auto" 
                min={5}
                max={50}
                onChangeCommitted={React.useCallback(
                    (e, v) => update({ wpm: v }),
                    [])}
            />

            <p>receiver volume</p>
            <MemoSlider size="small" value={settings.volume_receiver} aria-label="Default" valueLabelDisplay="auto"
                onChangeCommitted={React.useCallback(
                    (e, v) => update({ volume_receiver: v }),
                    [])}
             />
            <p>key volume</p>
            <MemoSlider size="small" value={settings.volume_key} aria-label="Default" valueLabelDisplay="auto"
                onChangeCommitted={React.useCallback(
                    (e, v) => update({ volume_key: v }),
                    [])}
             />
            <div>
                <p>show letters</p>
                <MemoSwitch 
                    checked={settings.show_readable}
                    color="secondary"
                    onChange={React.useCallback(
                        (e) => update({ show_readable: e.target.checked }),
                        [])}
                />
            </div>

            { settingsButton }
        </div>
    );
}

export function AdvancedControls({className = ""}) {

    const dispatch = useDispatch()
    let settings = useSelector(state => state.user.settings)
    function update(data) {
        dispatch(updateSettings(data))
    }
    return (
        <div className={`${styles.controls} ${className}`}>
            <h2>Advanced settings</h2>
            <p>submit delay</p>
            <MemoSlider size="small" value={settings.submit_delay} aria-label="Default" valueLabelDisplay="auto"
                min={5}
                max={50}
                onChangeCommitted={React.useCallback(
                    (e, v) => update({ submit_delay: v }),
                    [])}
             />
            <p>key mode</p>
            <RadioGroup
                row
                aria-labelledby="demo-controlled-radio-buttons-group"
                name="controlled-radio-buttons-group"
                value={settings.key_mode}
                onChange={ e => update({ key_mode: e.target.value})}
            >
                <FormControlLabel value="straight" control={<Radio />} label="straight" />
                <FormControlLabel value="yambic" control={<Radio />} label="yambic A" />
            </RadioGroup>
            <p style={{marginTop: "1rem"}}>yambic paddle order</p>
            <div>
                <p>left is dot</p>
                <MemoSwitch 
                    checked={! settings.left_is_dot}
                    color="primary"
                    onChange={React.useCallback(
                        (e) => update({ left_is_dot: ! e.target.checked }),
                        [])}
                />
                <p>right is dot</p>
            </div>
        </div>
    )
}

export function KeybindingsControls({className}){
    return (
        <div className={`${styles.controls} ${styles.keybindings} ${className}`}>
            <h2>Keybindings</h2>
            <p>straight key SPACE, C</p>
            <p>left paddle Z</p>
            <p>right paddle X</p>
        </div>
    )

}


export function DialectControls({className}){
  const dispatch = useDispatch()
  let settings = useSelector(state => state.user.settings)
  function update(data) {
    dispatch(updateSettings(data))
  }
  return (
    <div className={`${styles.controls} ${styles.dialects} ${className}`}>
      <Select
        id="dialect-select"
        value={settings.dialect}
        onChange={e => update({
          dialect: e.target.value
        })}
      >
        {
        Object.keys(dialects).map( (name, i) => 
          <MenuItem value={name} key={i} name={dialects[name].name}>{dialects[name].name}</MenuItem>)
      }
      </Select>
    </div>
  )

}
