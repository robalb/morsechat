import Button from "@mui/material/Button";
import SettingsIcon from "@mui/icons-material/Settings";
import * as React from "react";
import Slider from '@mui/material/Slider';
import { useSelector, useDispatch } from 'react-redux'
import { updateSettings } from "../../redux/userSlice";
import styles from './sideControls.module.css';
import { useSnackbar } from 'notistack';

import { useStateDep } from "../../hooks/useStateDep";
import { Switch } from "@mui/material";

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

export function SideControls({className = ""}) {
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
        <div className={`${styles.sidecontrols} ${className}`}>
            <h2>controls</h2>
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
            <p>submit delay</p>
            <MemoSlider size="small" value={settings.submit_delay} aria-label="Default" valueLabelDisplay="auto"
                min={5}
                max={50}
                onChangeCommitted={React.useCallback(
                    (e, v) => update({ submit_delay: v }),
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

            <Button size="small" startIcon={<SettingsIcon/>} variant="outlined">
                Advanced
            </Button>
            { /*<p>advanced: morsedialect,keybindings,keymode,dot-dash-ratio</p>*/}
        </div>
    );
}
