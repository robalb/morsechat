import IconButton from "@mui/material/IconButton";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import * as React from "react";

import styles from './online.module.css';

export function Online({className = "", connectionStatus}) {
    let status = connectionStatus ? "connected" : "connecting.."

    const [animationClass, setAnimationClass] = React.useState(true);
    const [firstRender, setFirstRender] = React.useState(true);

    //change the animation class when the currentAction text changes
    React.useEffect(() => {
        //avoid showing the animation on the first render of the component
        if (firstRender) {
            setFirstRender(false)
        } else {
            setAnimationClass(a => !a)
        }
    }, [connectionStatus]);


    let statusStyles = [
        styles.status,
        (animationClass ? styles.a_1 : styles.a_2),
        (connectionStatus ? styles.ws_online : null)

    ].join(" ")
    return (
        <div className={`${styles.online_container} ${className}`}>
            <div className={styles.statusContainer}>

                <p className={statusStyles} >{status}</p>
            </div>
            <hr />
            <h2>online users </h2>
            <div className={styles.online}>
                {
                    Array(5).fill('ASDASD').concat(['FINAL00']).map((h, i) =>
                        <div key={i}>
                            <div className={styles.left}>
                                <p>{h}</p>
                                <div className={styles.typing}>
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
        </div>
    );
}