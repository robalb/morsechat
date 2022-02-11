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
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

import pageRender from '../../pageRender/pageRender'

import './app.css'
import {Info} from "../../components/info/Info";



function Header(props){
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


function Sheet({className= ""}){
  return (
    <div className="sheet">
      <div className="controls">
        <IconButton aria-label="close morse view">
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
  );
}

function Preview({className= ""}){
  return (
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
  );
}

function Chat({className= ""}){
  return (
    <div className="chat">
      { /* typed stuff, progress bar, actual chat*/}
      <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
      <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
      <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
      <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
      <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
      <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
      <p className="you"><span>IT00HAL</span>: asdasd asd dsad ads</p>
      <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
      <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
      <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
      <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
      <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
      <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
    </div>
  );
}

function Key({className= ""}){
  return (
    <div className="key">
      <button className='activex'>-</button>
    </div>
  );
}
function Online({className= ""}){
  return (
    <div className="online">
      <h2>online</h2>
      {
        ['IT000HAL', 'AS89ASD', 'ASDASDd', 'SLUR000'].map((h, i) =>
          <div key={i}>
            <div className="left">
              <p>{h}</p>
              <div className="typing">
                <div></div>
                <div></div>
              </div>
            </div>
            <IconButton aria-label="mute user">
              <VolumeOffIcon />
            </IconButton>
          </div>
        )
      }
    </div>
  );
}
function SideControls({className= ""}){
  return (
    <div className="sidecontrols">
      <h2>controls</h2>
      <p>wpm</p>
      <p>receiver volume</p>
      <p>key volume</p>
      <p>submit delay</p>
      <p>show words</p>
      <Button size="small" startIcon={<SettingsIcon />} variant="outlined">
        Advanced
      </Button>
    </div>
  );
}

export default function App() {
  return (
    <div className="app-container">
      <Header />
      <main>
        <Info className="grid-info" />
        <div className="side">
          <Online />
          <SideControls />
        </div>
        <Preview />
        <Chat />
        <Key />
        <Sheet />
      </main>
    </div>
  );
}

pageRender(App)