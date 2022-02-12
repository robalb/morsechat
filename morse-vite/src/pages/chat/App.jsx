import * as React from 'react';
import './app.css'

import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';

import pageRender from '../../pageRender/pageRender'

import {Info} from "../../components/info/Info";
import {Sheet} from "../../components/sheet/Sheet";
import {Preview} from "../../components/preview/Preview";
import {Chat} from "../../components/chat/Chat";
import {Key} from "../../components/key/Key";
import {Online} from "../../components/online/Online";
import {SideControls} from "../../components/sideControls/SideControls";
import {Header} from "../../components/header/Header";


export default function App() {


  let [sidebarOpen, setSidebarOpen] = React.useState(false);
  function closeSidebar(event){
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setSidebarOpen(false);
  }

  return (
    <div className="app-container">
      <Drawer
        anchor="left"
        open={sidebarOpen}
        onClose={closeSidebar}
      >
        <h2>sidebar. put here the Info component on mobile</h2>
      </Drawer>

      <Header 
        leftContent={
          <>
            <IconButton aria-label="Menu" onClick={e => setSidebarOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Button className="header-bt-left" startIcon={<PeopleIcon />}>
              <output>
                2
              </output>
            </Button>
          </>
        }
      />
      <main>
        <Info className="grid-info" />
        <div className="grid-side">
          <Online />
          <SideControls className='grid-side-sidecontrols'/>
        </div>
        <Preview className='grid-preview'/>
        <Chat className='grid-chat'/>
        <Key className='grid-key'
          leftButton={
            <IconButton aria-label="Settings">
              <SettingsIcon />
            </IconButton>
          }
        />
        <Sheet className='grid-sheet'/>
      </main>
    </div>
  );
}

pageRender(App)