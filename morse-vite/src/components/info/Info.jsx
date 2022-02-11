import discordUrl from "../../fonts/discord.svg";
import githubUrl from "../../fonts/github.svg";
import * as React from "react";
import styles from './info.module.css'

export function Info({className="", ...props}) {
    return (
        <div className={`${styles.info} ${className}`} >
            <h1>Morsechat</h1>
            <p>Welcome to the best internet morse radio. </p>
            <p>
                This webapp is open source! <br/> Join the discord community
                to get the latest news, and to participate on its development.
            </p>
            <h3>What's new</h3>
            <p>2021-02-10 update notes</p>
            <a href="https://discord.gg/JPzfzNJG6e">
                <img src={discordUrl}/>
            </a><br/>
            <a href="https://github.com/robalb/morsechat">
                <img src={githubUrl}/>
            </a>
        </div>
    )
}