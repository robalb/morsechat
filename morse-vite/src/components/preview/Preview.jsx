import IconButton from "@mui/material/IconButton";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import * as React from "react";

import styles from './preview.module.css';

export function Preview({className = "", width, text, deleteHandler}) {
    let cssWidth = width + "%"
    return (
        <div className={`${styles.preview} ${className}`}>
            <div className={styles.progress} style={{width: cssWidth}}>
            </div>
            <div className={styles.text}>
                <p>{text}</p>
                <IconButton aria-label="cancel message">
                    <DeleteOutlineIcon/>
                </IconButton>
            </div>

        </div>
    );
}