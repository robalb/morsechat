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

export default function App() {
  let [sidebarOpen, setSidebarOpen] = React.useState(false);
  function toggleSidebar(event){
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setSidebarOpen(false);
  }
  return (
    <div className="app-container">
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
    <main>
      <div className="side">
          { /* only visible in desktiop, show users to the side of chat (right side?) (show also user& logged status?) */}
      </div>
      <div className="preview">

      </div>
      <div className="chat">
          { /* typed stuff, progress bar, actual chat*/ }
      </div>
      <div className="key">
          { /* the morse key. */ }
      </div>
      <div className="sheet">

      </div>
      <div className="info">

      </div>
    </main>
    </div>
  );
}

pageRender(App)