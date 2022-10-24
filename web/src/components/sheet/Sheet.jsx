import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import * as React from "react";
import { Button } from "@mui/material";
import styles from './sheet.module.css';
import getDialect from '../../utils/dialects'
import {dialects} from '../../utils/dialects'
import { useSelector, useDispatch } from 'react-redux'
import { updateSettings } from "../../redux/userSlice";

export function Sheet({className = "", closeBtHandler}) {
    const dispatch = useDispatch()
    let dialectName = useSelector(state => state.user.settings.dialect)
    let dialect = getDialect(dialectName)
    let tableContent = Object.keys(dialect.table)
        .map(e => ({code:e, symbol: dialect.table[e]}))
        //.sort()
        .map(e => <p key={e.code}>{e.symbol} {e.code}</p>)

    /* change the current dialect to the next one in the dialects array */
    const rotateDialect = () =>{
      let dialectNames = Object.keys(dialects)
      let nextDialectName = dialectNames[
        ( dialectNames.indexOf(dialectName) + 1 ) % dialectNames.length
      ]
      dispatch(updateSettings({
        dialect: nextDialectName
    }))
    }

    return (
        <div className={`${styles.sheet} ${className}`}>
            <div className={styles.controls}>
                <IconButton aria-label="close morse view" onClick={closeBtHandler}>
                    <CloseIcon/>
                </IconButton>
                <Button size="small" onClick={rotateDialect}>
                    {dialect.name}
                </Button>
            </div>
            <div className={styles.list}>
                {tableContent}
            </div>
        </div>
    );
}
