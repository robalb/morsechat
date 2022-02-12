import IconButton from "@mui/material/IconButton";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import * as React from "react";

import styles from './online.module.css';

export function Online({className = ""}) {
    return (
        <div className={`${styles.online} ${className}`}>
            <h2>online</h2>
            {
                ['IT000HAL', 'AS89ASD', 'ASDASDd', 'SLUR000'].map((h, i) =>
                    <div key={i}>
                        <div className={styles.left}>
                            <p>{h}</p>
                            <div className={styles.typing}>
                                <div></div>
                                <div></div>
                            </div>
                        </div>
                        <IconButton aria-label="mute user">
                            <VolumeOffIcon/>
                        </IconButton>
                    </div>
                )
            }
        </div>
    );
}