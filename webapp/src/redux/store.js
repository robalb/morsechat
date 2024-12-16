import { configureStore, createAsyncThunk } from '@reduxjs/toolkit'

import userReducer from './userSlice'
import appReducer from './appSlice'
import apiReducer from './apiSlice'
import chatReducer from './chatSlice'

//creiamo 2 thunks: loadAccountData, setAccountData
// https://stackoverflow.com/questions/66613260/how-to-dispatch-asyncthunk-inside-another-asyncthunk
// ogni slice registra negli extraReducers loadAccountData, e aggiorna il proprio stato usando la
// parte di dati restituita che gli interessa


// https://redux-toolkit.js.org/api/createSlice#extrareducers
export default configureStore({
  reducer: {
    user: userReducer,
    app: appReducer,
    api: apiReducer,
    chat: chatReducer
  },
})


/*

user:
'authenticated': this.current_user.is_authenticated,
'show_popup': this.session['show_popup'],
'callsign': this.current_user.callsign,
'country': this.session['country'],
--canbeempty
'settings': None
'id': this.current_user.id,
'username': this.current_user.username,
'last_online': this.current_user.last_online,
--


api:
'csrf': this.session['csrf']


chat:
'pusher_key': pusher_key,
'pusher_cluster': pusher_cluster,
'pusher_host': pusher_host,
'pusher_port': pusher_port,
'rooms': {
'chat': 3,
'radio': 3
}
}



*/
