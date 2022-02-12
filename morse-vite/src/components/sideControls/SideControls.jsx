import Button from "@mui/material/Button";
import SettingsIcon from "@mui/icons-material/Settings";
import * as React from "react";

import styles from './sideControls.module.css';

export function SideControls({className = ""}) {
    return (
        <div className={`${styles.sidecontrols} ${className}`}>
            <h2>controls</h2>
            <p>wpm</p>
            <p>receiver volume</p>
            <p>key volume</p>
            <p>submit delay</p>
            <p>show words</p>
            <Button size="small" startIcon={<SettingsIcon/>} variant="outlined">
                Advanced
            </Button>
        </div>
    );
}