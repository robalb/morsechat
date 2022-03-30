import Button from "@mui/material/Button";
import SettingsIcon from "@mui/icons-material/Settings";
import * as React from "react";
import Slider from '@mui/material/Slider';
import { useSelector, useDispatch } from 'react-redux'
import { updateSettings } from "../../redux/userSlice";
import styles from './sideControls.module.css';
import { useSnackbar } from 'notistack';

import { useStateDep } from "../../hooks/useStateDep";

export function SideControls({className = ""}) {
    const {enqueueSnackbar} = useSnackbar();
    const dispatch = useDispatch()
    let settings = useSelector(state => state.user.settings)

    function update(data){
        dispatch(updateSettings(data)).unwrap()
        .catch(e => 
            enqueueSnackbar("your settings could not be saved", {variant: "error", preventDuplicate:true})
        )
    }

    let [wpm, setWpm] = useStateDep(settings.wpm)
    return (
        <div className={`${styles.sidecontrols} ${className}`}>
            <h2>controls</h2>
            <p>wpm</p>
            <Slider size="small" value={wpm} aria-label="Default" valueLabelDisplay="auto" 
                onChange={e=>{ setWpm(e.target.value) }}
                onChangeCommitted={(e,v) => update({wpm: v}) }
            />
            <p>receiver volume</p>
            <Slider size="small" defaultValue={50} aria-label="Default" valueLabelDisplay="auto" />
            <p>key volume</p>
            <Slider size="small" defaultValue={50} aria-label="Default" valueLabelDisplay="auto" />
            <p>submit delay</p>
            <Slider size="small" defaultValue={50} aria-label="Default" valueLabelDisplay="auto" />
            <Button size="small" startIcon={<SettingsIcon/>} variant="outlined">
                Advanced
            </Button>
            { /*<p>advanced: morsedialect,keybindings,keymode,dot-dash-ratio</p>*/}
        </div>
    );
}
