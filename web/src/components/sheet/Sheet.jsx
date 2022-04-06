import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import * as React from "react";
import { useSelector } from 'react-redux'
import { Button } from "@mui/material";
import styles from './sheet.module.css';
import getDialect from '../../utils/dialects'

export function Sheet({className = "", closeBtHandler}) {
    let dialectName = useSelector(state => state.user.settings.dialect)
    let dialect = getDialect(dialectName)
    let tableContent = Object.keys(dialect.table)
        .map(e => ({code:e, symbol: dialect.table[e]}))
        //.sort()
        .map(e => <p key={e.code}>{e.symbol} {e.code}</p>)

    return (
        <div className={`${styles.sheet} ${className}`}>
            <div className={styles.controls}>
                <IconButton aria-label="close morse view" onClick={closeBtHandler}>
                    <CloseIcon/>
                </IconButton>
                <Button size="small">
                    {dialect.name}
                </Button>
            </div>
            <div className={styles.list}>
                {tableContent}
            </div>
        </div>
    );
}