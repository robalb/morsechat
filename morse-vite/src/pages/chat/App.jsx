import * as React from 'react';


import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Drawer from '@mui/material/Drawer';

import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

import pageRender from '../../pageRender/pageRender'

import './app.css'
import {Info} from "../../components/info/Info";
import {Sheet} from "../../components/sheet/Sheet";
import {Preview} from "../../components/preview/Preview";
import {Chat} from "../../components/chat/Chat";
import {Key} from "../../components/key/Key";
import {Online} from "../../components/online/Online";
import {SideControls} from "../../components/sideControls/SideControls";


function Header({leftContent="", rightContent=""}){
  let [sidebarOpen, setSidebarOpen] = React.useState(false);
  function toggleSidebar(event){
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setSidebarOpen(false);
  }
  return(
    <header>

      <div>
        <IconButton aria-label="Menu" onClick={e => setSidebarOpen(true)}>
          <MenuIcon />
        </IconButton>
        <Drawer
          anchor="left"
          open={sidebarOpen}
          onClose={toggleSidebar}
        >
          <h2>morsechat</h2>
        </Drawer>

        <Button className="header-bt-left" startIcon={<PeopleIcon/>}>
          <output>
            2
          </output>
        </Button>
      </div>

      <Select
        id="demo-simple-select"
        value={1}
      >
        <MenuItem value={1} >{"ch 1"}</MenuItem>
        <MenuItem value={2} >{"ch 1"}</MenuItem>
      </Select>

      <div>
        <IconButton className="header-bt-right" aria-label="Settings">
          <SettingsIcon />
        </IconButton>

        <IconButton aria-label="morse table">
          <LibraryBooksIcon />
        </IconButton>
      </div>

    </header>
  )
}


export default function App() {
  return (
    <div className="app-container">
      <Header 
        leftContent={
          []
        }
        rightContent={
          []
        }/>
      <main>
        <Info className="grid-info" />
        <div className="grid-side">
          <Online />
          <SideControls />
        </div>
        <Preview className='grid-preview'/>
        <Chat className='grid-chat'/>
        <Key className='grid-key'/>
        <Sheet className='grid-sheet'/>
      </main>
    </div>
  );
}

pageRender(App)