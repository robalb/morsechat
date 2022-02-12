import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import * as React from "react";

import styles from './header.module.css';

import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Button from '@mui/material/Button';

export function Header({leftContent = ""}) {
    return (
        <header className={styles.header}>
            <div>
                {leftContent}
            </div>
            <Select
                id="demo-simple-select"
                value={1}
            >
                <MenuItem value={1}>{"channel 1"}</MenuItem>
                <MenuItem value={2}>{"channel 2"}</MenuItem>
                <MenuItem value={2}>{"channel 3"}</MenuItem>
            </Select>
            <div>
                {
                    false ? 
                        <Button startIcon={<AccountCircleIcon />} >IT000HLB</Button>
                    :
                        <>
                            <Button>Login</Button>
                            <Button >register</Button>
                        </>
                }
            </div>
        </header>
    )
}