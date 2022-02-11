import * as React from "react";
import styles from './key.module.css';

export function Key({className = ""}) {
    return (
        <div className={`${styles.key} ${className}`}>
            <button className='activex'>-</button>
        </div>
    );
}