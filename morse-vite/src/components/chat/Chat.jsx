import * as React from "react";

import styles from './chat.module.css';

export function Chat({className = ""}) {
    return (
        <div className={`${styles.chat} ${className}`}>
            { /* typed stuff, progress bar, actual chat*/}
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p className={styles.you}><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
            <p><span>IT00HAL</span>: asdasd asd dsad ads</p>
        </div>
    );
}