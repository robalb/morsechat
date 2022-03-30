import * as React from "react";

import styles from './header.module.css';

import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton"
import MenuItem from "@mui/material/MenuItem";
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import Logout from '@mui/icons-material/Logout';
import ListItemIcon from '@mui/material/ListItemIcon';

import { useSelector, useDispatch } from 'react-redux'
import { logoutUser } from "../../redux/userSlice";
import { setChannel } from "../../redux/chatSlice";

export function Header({leftContent = "", authState}) {
    const dispatch = useDispatch()
    let loading = useSelector(state => state.api.loading)
    let authenticated = useSelector(state => state.user.authenticated)
    let username = useSelector(state => state.user.username)

    let channel = useSelector(state => state.chat.channel)
    let channels = useSelector(state => state.chat.channels)
    
    async function logoutHandler(){
        dispatch(logoutUser())
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

    if(!loading){
        rightContent = authenticated ?
            <>
                <Button
                    startIcon={<AccountCircleIcon />}
                    onClick={handleClick}
                    aria-controls={open ? 'account-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                > {username}</Button>
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
                id="channel-select-header"
                value={channel}
                onChange={e => dispatch(setChannel(e.target.value))}
            >
                {
                    channels.map(({ch, name}) => 
                        <MenuItem value={ch} key={ch}>{name}</MenuItem>)
                }
            </Select>
            <div>
                { rightContent }
            </div>
        </header>
    )
}