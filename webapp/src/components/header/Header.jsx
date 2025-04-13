import * as React from "react";

import styles from './header.module.css';

import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton"
import MenuItem from "@mui/material/MenuItem";
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ShieldIcon from '@mui/icons-material/Shield';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import Logout from '@mui/icons-material/Logout';
import ListItemIcon from '@mui/material/ListItemIcon';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

import { useSelector, useDispatch } from 'react-redux'
import { logoutUser } from "../../redux/userSlice";
import { setChannel } from "../../redux/chatSlice";

// Import your ModerationMenu component
import ModerationMenu from "../moderation/ModerationMenu";

export function Header({ leftContent = "", authState }) {
    const dispatch = useDispatch();
    let loading = useSelector(state => state.api.loading);
    let authenticated = useSelector(state => state.user.authenticated);
    let ismoderator = useSelector(state => state.user.ismoderator);
    let isadmin = useSelector(state => state.user.isadmin);
    let username = useSelector(state => state.user.username);

    let channel = useSelector(state => state.chat.channel);
    let channels = useSelector(state => state.chat.channels);

    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);
    const handleClick = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    // Moderation dialog state
    const [moderationOpen, setModerationOpen] = React.useState(false);
    const handleModerationOpen = () => setModerationOpen(true);
    const handleModerationClose = () => setModerationOpen(false);

    async function logoutHandler() {
        dispatch(logoutUser());
    }

    function setAuthPageClick(page) {
        return e => authState[1](page);
    }

    let rightContent =
        <Skeleton variant="rectangular" animation="wave" width={110} height={20} sx={{ bgcolor: 'grey.800' }} />;

    if (!loading) {
        rightContent = authenticated ? (
            <>
                {(isadmin || ismoderator) &&
                  <Button
                      startIcon={<ShieldIcon />}
                      onClick={handleModerationOpen}
                  >
                      Moderation
                  </Button>
                }

                <Button
                    startIcon={<AccountCircleIcon />}
                    onClick={handleClick}
                    aria-controls={open ? 'account-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                >
                    {username}
                </Button>

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
                        View Profile
                    </MenuItem>
                    <MenuItem onClick={logoutHandler}>
                        <ListItemIcon>
                            <Logout fontSize="small" />
                        </ListItemIcon>
                        Logout
                    </MenuItem>
                </Menu>

                {/* Moderation Popup */}
                <Dialog open={moderationOpen} onClose={handleModerationClose} fullScreen>
                    <DialogTitle sx={{ m: 0, p: 2 }}>
                        Moderation Menu
                        <IconButton
                            aria-label="close"
                            onClick={handleModerationClose}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                                color: (theme) => theme.palette.grey[500],
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <ModerationMenu />
                    </DialogContent>
                </Dialog>
            </>
        ) : (
            <>
                <Button onClick={setAuthPageClick("login")}>Login</Button>
                <Button variant="outlined" size="small" onClick={setAuthPageClick("register")}>Register</Button>
            </>
        );
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
                {channels.map(({ ch, name }) =>
                    <MenuItem value={ch} key={ch}>{name}</MenuItem>
                )}
            </Select>
            <div>
                {rightContent}
            </div>
        </header>
    );
}
