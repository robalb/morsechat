import * as React from "react";
import {SideControls, DialectControls, AdvancedControls, KeybindingsControls} from "../controls/controls";
import {Grid, IconButton} from '@mui/material';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CloseIcon from '@mui/icons-material/Close';

import Dialog from "@mui/material/Dialog";

import styles from './settings.module.css';


export function Settings({open, setOpen, mobileView}){

    function closeAuth(event) {
        if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
            return;
        }
        setOpen(false)
    }

    return (
        <Dialog
            PaperProps={{
              elevation: 1
            }}
            fullWidth={mobileView}
            open={open}
            scroll="paper"
            onClose={closeAuth}
        >
             <DialogTitle id="scroll-dialog-title">
                <IconButton aria-label="close" color="primary" onClick={e => setOpen(false)}>
                    <CloseIcon />
                </IconButton>
             </DialogTitle>
             <DialogContent dividers={true}>

            <div className={styles.settingsContainer}>
                { mobileView && <SideControls /> }
                <AdvancedControls />
                <DialectControls />
                <KeybindingsControls />

            </div>
            </DialogContent>

        </Dialog>
    )

}

