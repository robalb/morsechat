import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import * as React from "react";

import styles from './sheet.module.css';

export function Sheet({className = ""}) {
    return (
        <div className={`${styles.sheet} ${className}`}>
            <div className={styles.controls}>
                <IconButton aria-label="close morse view">
                    <CloseIcon/>
                </IconButton>
            </div>
            <div className={styles.list}>
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