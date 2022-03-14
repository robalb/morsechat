import * as React from "react"
import appContext from '../contexts/appContext'

import {request, baseApiUrl} from '../utils/apiResolver'

const AppProvider = ({children}) => {


    const initialSettings = {
        wpm: 12,
        volume_receiver: 1,
        volume_key: 1,
        dialect: "asd2d2dwd",
        key_mode: "yambic",
        show_readable: true,
        submit_delay: 1000,
        keybinds: {
            straight: "c",
            yambic_dot: "z",
            yambic_dash: "x",
            cancel_message: "p",
        }
    }
    //todo: add some kind of flag to the settings object, to signal its state in the
    //live update lifecycle. add reducer options to change that state, and updates
    //should also change the state
    function settingsReducer(state, action) {
        switch (action.type) {
            case 'update':
                return Object.assign({}, state, action.payload)
            case 'updateAll':
                return Object.assign({}, action.payload);
            default:
                throw new Error("invalid action in settings reducer");
        }
    }
    const [settings, settingsDispatch] = React.useReducer(settingsReducer, initialSettings)

    const initialUsers = []
    //TODO: define a user object structure. something like
    /*
    {
      id,
      activeAudio,
      callsign,
      typing,
      dialect
    }
    */

    //TODO: typing and toggleAudio actions
    function usersReducer(state, action) {
        switch (action.type) {
            case 'add':
                let stateCopy = state.slice(0)
                return stateCopy
            case 'remove':
                stateCopy = state.slice(0)
                return stateCopy
            default:
                throw new Error("invalid action in settings reducer");
        }
    }
    const [users, usersDispatch] = React.useReducer(usersReducer, initialUsers)

    const [connected, setConnected] = React.useState(false)

    const [channel, setChannel] = React.useState('presence-ch1')
    const [channels, setChannels] = React.useState([
        {ch:'presence-ch1', name:'ch1'},
        {ch:'presence-ch2', name:'ch2'},
        {ch:'presence-ch3', name:'ch3'},
    ])

    let appContextValues = {
        settings,
        settingsDispatch,
        users,
        usersDispatch,
        connected,
        setConnected,
        channel,
        setChannel,
        channels,
        setChannels
    }

    return (
        <appContext.Provider value={appContextValues}>
            {children}
        </appContext.Provider>
    )
}

export default AppProvider
