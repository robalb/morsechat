import * as React from 'react';


import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Drawer from '@mui/material/Drawer';

import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

import pageRender from '../../pageRender/pageRender'

import './app.css'
import discordUrl from '../../fonts/discord.svg'
import githubUrl from '../../fonts/github.svg'

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
        <div className="progress">
        </div>
        <div className="text">
          <p>hello world cammin di nostra vita mi ritrovai per una selva uscura_..</p>
          <IconButton aria-label="cancel message">
            <DeleteOutlineIcon />
          </IconButton>
        </div>

      </div>
      <div className="chat">
          { /* typed stuff, progress bar, actual chat*/ }
      </div>
      <div className="key">
          { /* the morse key. */ }
      </div>
      <div className="sheet">
        <div className="controls">
          <IconButton color="opposite_text" aria-label="close morse view">
            <CloseIcon />
          </IconButton>
        </div>
        <div className="list">
          <p>A .-</p><p>B -...</p><p>C -.-.</p><p>D -..</p>
          <p>E .</p><p>F ..-.</p><p>G --.</p><p>H ....</p>
          <p>I ..</p><p>J .---</p><p>K -.-</p><p>L .-..</p>
          <p>M --</p><p>N -.</p><p>O ---</p><p>P .--.</p>
          <p>Q --.-</p><p>R .-.</p><p>S ...</p><p>T -</p>
          <p>U ..-</p><p>V ...-</p><p>W .--</p><p>X -..-</p>
          <p>Y -.--</p><p>Z --..</p><p>. .-.-.-</p><p>, --..--</p>
          <p>? ..--..</p><p>' .----.</p><p>! -.-.--</p><p>/ -..-.</p>
          <p>: ---...</p><p>; -.-.-.</p><p>= -...-</p><p>+ .-.-.</p>
          <p>- -....-</p><p>@ .--.-.</p><p>1 .----</p><p>2 ..---</p>
          <p>3 ...--</p><p>4 ....-</p><p>5 .....</p><p>6 -....</p>
          <p>7 --...</p><p>8 ---..</p><p>9 ----.</p><p>0 -----</p>

        </div>
      </div>
      <div className="info">
        <h1>Morsechat</h1>
        <p>Welcome to the best internet morse radio. </p>
        <p>
          This webapp is open source! <br/> Join the discord community
          to get the latest news, and to participate on its development.
        </p>
        <h3>What's new</h3>
        <p>12/11/2021 update notes</p>
        <a href="https://discord.gg/JPzfzNJG6e">
          <img src={discordUrl} />
        </a><br/>
        <a href="https://github.com/robalb/morsechat">
          <img src={githubUrl} />
        </a>
      </div>
    </main>
    </div>
  );
}

pageRender(App)