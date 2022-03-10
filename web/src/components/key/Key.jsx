import * as React from "react";
import styles from './key.module.css';

import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

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

            <button className={styles.key_bt}>-</button>

            <IconButton aria-label="morse table" onClick={sheetBtHandler}>
              <LibraryBooksIcon />
            </IconButton>
        </div>
    );
}