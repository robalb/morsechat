import { createSlice, createAsyncThunk, createAction } from '@reduxjs/toolkit'
import { apiCall, payloadCreatorCreator } from './apiSlice'
import {getInstance} from '../socket/global.js'


const morseCall = createAsyncThunk(
  'api/morsecall',
  async ({data={}}, {getState, rejectWithValue, signal}) => {
    if(getInstance()){
      getInstance().sendMessage(data)
    }
    //TODO: register callback
    // if(response.error){
    //   return rejectWithValue({
    //     error: response.error,
    //     details: response.details
    //   })
    // }else{
    //   return response;
    // }
    return rejectWithValue({
      error: "temporary error",
      details: "details"
    })
})



const initialState = {
    channel: "presence-ch1",
    channels: [
        {ch:'presence-training', name:'training'},
        {ch:'presence-ch1', name:'ch1'},
        {ch:'presence-ch2', name:'ch2'},
        {ch:'presence-ch3', name:'ch3'},
        {ch:'presence-ch4', name:'ch4'},
        {ch:'presence-ch5', name:'ch5'},
        {ch:'presence-ch6', name:'ch6'},
        {ch:'presence-pro-1', name:'pro1'},
        {ch:'presence-pro-2', name:'pro2'},
        {ch:'presence-pro-3', name:'pro3'},
    ],
    connected: false,
    connectionStatus: "powering on",
    /*
    * { [callsign key: string ] : {
    *   is_anonymous bool
    *   typing bool
    *   allowSound bool
    *   username string (can be an empty string if the user is anonymous)
    *   callsign string (acts as an identifier for the iser)
    * }
    */
    onlineUsers: {},
    socketRef: null,
    chat: [],
    myID: "",
    keyDown: false,
    lastTime: 0,
    currentLetter:[],
    messageBuffer: []
}

export const keyDown = createAction('chat/keyDown', function prepare() {
  return {
    payload: {
        time: Math.floor(+new Date() / 1)
    },
  }
})
export const _keyUp = createAction('chat/keyUp', function prepare() {
  return {
    payload: {
        time: Math.floor(+new Date() / 1)
    },
  }
})

/**
 * This thunk act as a proxy for _keyUp
 * and dispatches a 'typing' api call when the conditions are right
 */
export const keyUp = function(typingGuard=10){
    return (dispatch, getState)=>{
        let s = getState()
        let trainingChannel = (s.chat.channel == "presence-training")
        //if keyUp was called for the nth time, with n == typingGuard*2
        //let everyone know we are typing
        let bufferLength = getState().chat.messageBuffer.length
        if(bufferLength === typingGuard * 2 && !trainingChannel)
        //perform ws api call
        if(getInstance())
          getInstance().sendTyping(true)
        dispatch(_keyUp())
    }
}


export const send = createAsyncThunk(
  'chat/send',
  async (data, {getState, dispatch, rejectWithValue, signal}) => {
    let s = getState()
    dispatch(chatSlice.actions.resetMessage())
    if(s.chat.channel == "presence-training"){
      return {
        training: true
      }
    }
    return dispatch(morseCall({
      data: {
          message: s.chat.messageBuffer,
          dialect: s.user.settings.dialect,
          wpm: s.user.settings.wpm
      }
    }))
  })


const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setSocketRef(state, action){
        state.socketRef = action.payload
    },
    setChannel(state, action){
        state.channel = action.payload
    },
    setChannelByName(state, action){
        let filtered = state.channels.filter(current => current.name === action.payload)
        if (filtered.length > 0){
            state.channel = filtered[0].ch
        }
    },
    setConnected(state, action){
        state.connected = ['connected', 'connecting'].includes(action.payload)
        state.connectionStatus = action.payload
    },
    resetMessage(state, action){
        state.lastTime = 0
        state.messageBuffer = []
    },
    updateOnline(state, action){
        let onlineUsersWithSoundStatus = {}
        action.payload.users.forEach(u =>{
          //configure sound
          let allowSound = true
          if(u.callsign == action.payload.me){
            allowSound = false
          }
          if(state.onlineUsers[u.callsign]){
              allowSound = state.onlineUsers[u.callsign].allowSound
          }
          //add users as key value object
          onlineUsersWithSoundStatus[u.callsign] = {
              ...u,
              allowSound
          }
        })
        state.onlineUsers = onlineUsersWithSoundStatus
        state.myID = action.payload.me
    },
    setTyping(state, action){
        if(state.onlineUsers[action.payload.user]){
            state.onlineUsers[action.payload.user].typing = action.payload.typing
        }
    },
    setAllowSound(state, action){
        if(state.onlineUsers[action.payload.user]){
            state.onlineUsers[action.payload.user].allowSound = action.payload.allowSound
        }
    }
  },
  extraReducers(builder) {
    builder.addCase(keyDown, (state, action) => {
        if(!state.keyDown){
            if(state.lastTime > 0){
                let delta = action.payload.time - state.lastTime
                state.messageBuffer.push(delta)
            }
            state.lastTime = action.payload.time
            state.keyDown = true
        }
    })
    builder.addCase(_keyUp, (state, action) => {
        if(state.keyDown){
            if(state.lastTime > 0){
                let delta = action.payload.time - state.lastTime
                state.messageBuffer.push(delta)
                state.lastTime = action.payload.time
            }
            state.keyDown = false
        }
    })
  }
})


/**
 * Use as selector for redux useSelector
 * @returns String - the readable name of the current channel, or undefined
 */
export function selectChannelName(state){
    let selectedChannel = state.chat.channel
    let filtered = state.chat.channels.filter(current => current.ch == selectedChannel)
    if(filtered.length > 0){
        return filtered[0].name
    }
    return undefined
}

export const {setSocketRef, setChannel, setChannelByName, setConnected, resetMessage, updateOnline, setTyping, setAllowSound} = chatSlice.actions

export default chatSlice.reducer

