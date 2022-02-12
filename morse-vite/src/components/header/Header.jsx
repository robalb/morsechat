import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import * as React from "react";

import styles from './header.module.css';

export function Header({leftContent = "", rightContent = ""}) {
    return (
        <header className={styles.header}>
            <div>
                {leftContent}
            </div>
            <Select
                id="demo-simple-select"
                value={1}
            >
                <MenuItem value={1}>{"ch 1"}</MenuItem>
                <MenuItem value={2}>{"ch 1"}</MenuItem>
            </Select>
            <div>
                {rightContent}
            </div>
        </header>
    )
}