import * as React from "react";

import styles from './header.module.css';

import mainContext from '../../contexts/mainContext'

import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton"
import MenuItem from "@mui/material/MenuItem";
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Button from '@mui/material/Button';

export function Header({leftContent = "", authState}) {
    let {state} = React.useContext(mainContext)

    function setAuthPageClick(page){
        return e => {
            authState[1]( page )
        }
    }

    let rightContent = 
        <Skeleton variant="rectangular" animation="wave" width={110} height={20} sx={{ bgcolor: 'grey.800' }}/>

    if(!state.loading){
        rightContent = state.sessionData.authenticated ?
            <Button startIcon={<AccountCircleIcon />} >{state.userData.username}</Button>
            :
            <>
                <Button onClick={setAuthPageClick("login")}>Login</Button>
                <Button variant="outlined" size="small" onClick={setAuthPageClick("register")}>register</Button>
            </>
    }

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
                { rightContent }
            </div>
        </header>
    )
}