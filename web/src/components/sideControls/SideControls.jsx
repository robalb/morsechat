import Button from "@mui/material/Button";
import SettingsIcon from "@mui/icons-material/Settings";
import * as React from "react";
import Slider from '@mui/material/Slider';

import appContext from "../../contexts/appContext";
import styles from './sideControls.module.css';

export function SideControls({className = ""}) {
    let {settings, settingsDispatch} = React.useContext(appContext);
    let [wpm, setWpm] = React.useState(settings.wpm)
    return (
        <div className={`${styles.sidecontrols} ${className}`}>
            <h2>controls</h2>
            <p>wpm</p>
            <Slider size="small" defaultValue={settings.wpm} aria-label="Default" valueLabelDisplay="auto" 
                onChangeCommitted={e => 
                    settingsDispatch({
                        type: "update",
                        payload: {
                            wpm: wpm
                        }
                    })
                }
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
