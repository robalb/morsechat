import IconButton from "@mui/material/IconButton";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import * as React from "react";

import styles from './online.module.css';

export function Online({className = "", connectionStatus}) {
    let status = connectionStatus ? "" : "- connecting.."
    return (
        <div className={`${styles.online_container} ${className}`}>
            <p className={`${styles.status} ${styles.a_1}`} >connecting</p>
            <hr />
            <h2>online users {status}</h2>
            <div className={styles.online}>
                {
                    Array(10).fill('ASDASD').concat(['FINAL00']).map((h, i) =>
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
        </div>
    );
}