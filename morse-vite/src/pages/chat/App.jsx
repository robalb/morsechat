import * as React from 'react';
import './app.css'

import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from "@mui/icons-material/Close";


import pageRender from '../../pageRender/pageRender'

import {Info} from "../../components/info/Info";
import {Sheet} from "../../components/sheet/Sheet";
import {Preview} from "../../components/preview/Preview";
import {Chat} from "../../components/chat/Chat";
import {Key} from "../../components/key/Key";
import {Online} from "../../components/online/Online";
import {SideControls} from "../../components/sideControls/SideControls";
import {Header} from "../../components/header/Header";

import useMediaQuery from '@mui/material/useMediaQuery';
import mainContext from '../../contexts/mainContext'
import {Auth} from "../../components/auth/Auth";

export default function App() {
  let {state, post, reload} = React.useContext(mainContext)

  /**
   * Breakpoints definitions.
   * These same breakpoints are defined in app.css
   */
  const tablet = useMediaQuery('(min-width:800px)');
  const desktop = useMediaQuery('(min-width:1400px)');

  let [sheetOpen, setSheetOpen] = React.useState(desktop);

  let [sidebarOpen, setSidebarOpen] = React.useState(false);
  function closeSidebar(event){
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setSidebarOpen(false);
  }

  function toggleSheet(e){
    setSheetOpen(!sheetOpen);
  }


  /**
   * auth popup
   */
  const authState = React.useState("");
  const setAuthPage = authState[1];

  React.useEffect(()=>{
    console.log("state change detected")
    console.log(state)
    if(!state.loading && !state.sessionData.authenticated && state.sessionData.show_popup){
      setAuthPage( "menu")
    }
  }, [state])


  return (
    <div className="app-container">
      <Auth
        fullScreen={!tablet}
        authState={authState}
      />
      {
        !desktop &&
        <Drawer
          anchor="left"
          open={sidebarOpen}
          onClose={closeSidebar}
        >
          <div className='sidebar-controls'>

            <IconButton aria-label="close sidebar" onClick={closeSidebar}>
                <CloseIcon/>
            </IconButton>
          </div>
          <Info className='sidebar-info'/>
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
            <SideControls className='grid-side-sidecontrols'/>
          </div>
        }
        <Preview className='grid-preview'/>
        <Chat className='grid-chat'/>
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

pageRender(App)