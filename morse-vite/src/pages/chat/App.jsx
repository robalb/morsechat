import * as React from 'react';

import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

import pageRender from '../../pageRender/pageRender'

import './app.css'

export default function App() {
  return (
    <header>

      <div>
        <IconButton aria-label="Menu">
          <MenuIcon />
        </IconButton>

        <Button className="header-bt-left" startIcon={<PeopleIcon/>}>
          <output>
            2
          </output>
        </Button>
      </div>

      <p>asd</p>

      <div>
        <IconButton className="header-bt-right" aria-label="Settings">
          <SettingsIcon />
        </IconButton>

        <IconButton aria-label="morse table">
          <LibraryBooksIcon />
        </IconButton>
      </div>

    </header>
  );
}

pageRender(App)