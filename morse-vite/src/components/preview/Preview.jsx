import IconButton from "@mui/material/IconButton";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import * as React from "react";

import styles from './preview.module.css';

export function Preview({className = ""}) {
    return (
        <div className={`${styles.preview} ${className}`}>
            <div className={styles.progress}>
            </div>
            <div className={styles.text}>
                <p>hello world cammin di nostra vita mi ritrovai per una selva uscura_..</p>
                <IconButton aria-label="cancel message">
                    <DeleteOutlineIcon/>
                </IconButton>
            </div>

        </div>
    );
}