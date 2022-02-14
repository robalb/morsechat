import * as React from "react";
import mainContext from "../../contexts/mainContext";
import useMediaQuery from "@mui/material/useMediaQuery";
import {Auth} from "../../components/auth/Auth";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import {Info} from "../../components/info/Info";
import {Header} from "../../components/header/Header";
import MenuIcon from "@mui/icons-material/Menu";
import Button from "@mui/material/Button";
import PeopleIcon from "@mui/icons-material/People";
import {Online} from "../../components/online/Online";
import {SideControls} from "../../components/sideControls/SideControls";
import {Preview} from "../../components/preview/Preview";
import {Chat} from "../../components/chat/Chat";
import {Key} from "../../components/key/Key";
import SettingsIcon from "@mui/icons-material/Settings";
import {Sheet} from "../../components/sheet/Sheet";

import './appLayout.css'

export function AppLayout({previewWidth, previewText, previewClearHandler}) {
    let {state} = React.useContext(mainContext)

    /**
     * Breakpoints definitions.
     * These same breakpoints are defined in appLayout.css
     */
    const tablet = useMediaQuery('(min-width:800px)');
    const desktop = useMediaQuery('(min-width:1400px)');

    let [sheetOpen, setSheetOpen] = React.useState(desktop);

    let [sidebarOpen, setSidebarOpen] = React.useState(false);

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
        if (!state.loading &&
            !state.sessionData.authenticated &&
            state.sessionData.show_popup) {
            setAuthPage("menu")
        }
    }, [state])


    return (
        <div className="app-container">
            <Auth authState={authState} />
            {
                !desktop &&
                <Drawer
                    anchor="left"
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
                            <Button className="header-bt-left" startIcon={<PeopleIcon />}
                                aria-label="Online users">
                                <output>
                                    2
                                </output>
                            </Button>
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
                        <Online />
                        <SideControls className='grid-side-sidecontrols' />
                    </div>
                }
                <Preview className='grid-preview'
                    width={previewWidth}
                    text={previewText}
                    clearHandler={previewClearHandler}
                />
                <Chat className='grid-chat' />
                <Key className='grid-key'
                    leftButton={
                        tablet ? undefined :
                            <IconButton aria-label="Settings">
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