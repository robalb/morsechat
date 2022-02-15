import * as React from "react";

import styles from './header.module.css';

import mainContext from '../../contexts/mainContext'

import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton"
import MenuItem from "@mui/material/MenuItem";
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import Logout from '@mui/icons-material/Logout';
import ListItemIcon from '@mui/material/ListItemIcon';

export function Header({leftContent = "", authState}) {
    let {state, post, reload} = React.useContext(mainContext)

    async function logoutHandler(){
        const res = await post('logout', {});
        if(res.success){
            reload()
        }
    }

    function setAuthPageClick(page){
        return e => {
            authState[1]( page )
        }
    }

    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    let rightContent = 
        <Skeleton variant="rectangular" animation="wave" width={110} height={20} sx={{ bgcolor: 'grey.800' }}/>

    if(!state.loading){
        rightContent = state.sessionData.authenticated ?
            <>
                <Button
                    startIcon={<AccountCircleIcon />}
                    onClick={handleClick}
                    aria-controls={open ? 'account-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                > {state.userData.username}</Button>
                <Menu
                    anchorEl={anchorEl}
                    id="account-menu"
                    open={open}
                    onClose={handleClose}
                    onClick={handleClose}
                >
                    <MenuItem>
                        <ListItemIcon>
                            <AccountCircleIcon fontSize="small" />
                        </ListItemIcon>
                        view profile
                    </MenuItem>
                    <MenuItem onClick={logoutHandler}>
                        <ListItemIcon>
                            <Logout fontSize="small" />
                        </ListItemIcon>
                        Logout
                    </MenuItem>
                </Menu>
            </>
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