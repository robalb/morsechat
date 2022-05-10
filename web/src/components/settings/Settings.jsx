import * as React from "react";
import Dialog from "@mui/material/Dialog";

export function Settings({open, setOpen, fullScreen=true}){

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
            fullScreen={fullScreen}
            open={open}
            onClose={closeAuth}
        >
            <p>settings</p>
        </Dialog>
    )

}

