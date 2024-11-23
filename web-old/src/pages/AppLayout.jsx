import * as React from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import {Auth} from "../components/auth/Auth";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import {Info} from "../components/info/Info";
import {Header} from "../components/header/Header";
import MenuIcon from "@mui/icons-material/Menu";
import Button from "@mui/material/Button";
import PeopleIcon from "@mui/icons-material/People";
import {Online} from "../components/online/Online";
import {SideControls} from "../components/controls/controls";
import {Preview} from "../components/preview/Preview";
import {Chat} from "../components/chat/Chat";
import {Key} from "../components/key/Key";
import SettingsIcon from "@mui/icons-material/Settings";
import {Sheet} from "../components/sheet/Sheet";
import {Settings} from "../components/settings/Settings";
import { useSelector } from 'react-redux'

import './appLayout.css'

function MobileOnlineUsers(){
    let onlineUsers = useSelector(state => state.chat.onlineUsers)
    let count = Object.keys(onlineUsers).length
    return (
        <Button className="header-bt-left" startIcon={<PeopleIcon />}
            aria-label="Online users">
            <output>
                {count}
            </output>
        </Button>
    )
}

export function AppLayout({chatDomNode}) {
    let loading = useSelector(state => state.api.loading)
    let authenticated = useSelector(state => state.user.authenticated)
    let show_popup = useSelector(state => state.user.show_popup)

    /**
     * Breakpoints definitions.
     * These same breakpoints are defined in appLayout.css
     */
    const tablet = useMediaQuery('(min-width:800px)');
    const desktop = useMediaQuery('(min-width:1400px)');

    let [sheetOpen, setSheetOpen] = React.useState(desktop);

    let [sidebarOpen, setSidebarOpen] = React.useState(false);

    let [settingsOpen, setSettingsOpen] = React.useState(false)

    function closeSidebar(event) {
        if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
            return;
        }
        setSidebarOpen(false);
    }

    function toggleSheet(e) {
        setSheetOpen(!sheetOpen);
    }

    /**
     * auth popup
     */
    const authState = React.useState("");
    const setAuthPage = authState[1];

    React.useEffect(() => {
        if (!loading && !authenticated && show_popup) {
            setAuthPage("menu")
        }
    }, [loading, authenticated, show_popup])


    return (
        <div className="app-container">
            <Auth authState={authState} />
            <Settings open={settingsOpen} setOpen={setSettingsOpen}
                mobileView={!tablet}
            />
            {
                !desktop &&
                <Drawer
                    anchor="left"
                    elevation={1}
                    open={sidebarOpen}
                    onClose={closeSidebar}
                >
                    <div className='sidebar-controls'>

                        <IconButton aria-label="close sidebar" onClick={closeSidebar}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                    <Info className='sidebar-info' />
                </Drawer>
            }

            <Header
                leftContent={
                    <>
                        {
                            !desktop &&
                            <IconButton aria-label="Menu" onClick={e => setSidebarOpen(true)}>
                                <MenuIcon />
                            </IconButton>
                        }
                        {
                            !tablet &&
                            <MobileOnlineUsers />
                        }
                    </>
                }
                authState={
                    authState
                }
            />
            <main>
                {
                    desktop &&
                    <Info className="grid-info" />
                }
                {
                    tablet &&
                    <div className="grid-side">
                        <Online
                            className='grid-side-online'
                        />
                        <SideControls className='grid-side-sidecontrols'
                            settingsButton={
                                <Button size="small" startIcon={<SettingsIcon />}
                                    onClick={() => setSettingsOpen(t => !t)}
                                    variant="outlined">
                                    Advanced
                                </Button>
                            }
                        />
                    </div>
                }
                <Preview className='grid-preview' chatDomNode={chatDomNode}/>
                <Chat className='grid-chat' chatDomNode={chatDomNode}/>
                <Key className='grid-key'
                    leftButton={
                        tablet ? undefined :
                            <IconButton aria-label="Settings" 
                                onClick={()=> setSettingsOpen(t => !t)}>
                                <SettingsIcon />
                            </IconButton>
                    }
                    sheetBtHandler={toggleSheet}
                />
                {
                    sheetOpen &&
                    <Sheet className='grid-sheet'
                        closeBtHandler={toggleSheet}
                    />
                }
            </main>
        </div>
    );
}
