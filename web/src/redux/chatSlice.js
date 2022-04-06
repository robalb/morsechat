import { createSlice, createAsyncThunk, createAction } from '@reduxjs/toolkit'

const initialState = {
    channel: "presence-ch1",
    channels: [
        {ch:'presence-ch1', name:'ch1'},
        {ch:'presence-ch2', name:'ch2'},
        {ch:'presence-ch3', name:'ch3'},
    ],
    connected: false,
    connectionStatus: "powering on",
    online: [],
    chat: [],
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
export const keyUp = createAction('chat/keyUp', function prepare() {
  return {
    payload: {
        time: Math.floor(+new Date() / 1)
    },
  }
})


export const send = createAsyncThunk(
  'chat/send',
  async (_, {getState, dispatch, rejectWithValue, signal}) => {
    dispatch(chatSlice.actions.resetMessage())
  })


const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChannel(state, action){
        state.channel = action.payload
    },
    setConnected(state, action){
        state.connected = ['connected', 'connecting'].includes(action.payload)
        state.connectionStatus = action.payload
    },
    resetMessage(state, action){
        lastTime = 0
        messageBuffer = []
    }
  },
  extraReducers(builder) {
    // initial page load
    // builder.addCase(fetchAllData.fulfilled, (state, action) => {
    //   let toRet = action.payload.app
    //   return toRet
    // })
    builder.addCase(keyDown, (state, action) => {
        if(state.lastTime > 0){
            let delta = action.payload.time - state.lastTime
            state.messageBuffer.push(delta)
        }
        state.lastTime = action.payload.time
        state.keyDown = true
    })
    builder.addCase(keyUp, (state, action) => {
        //do nothing if keyUp is called when already up
        if(state.keyDown){
            let delta = action.payload.time - state.lastTime
            state.messageBuffer.push(delta)
            state.lastTime = action.payload.time
            state.keyDown = false
        }
    })
  }
})

export const {setChannel, setConnected} = chatSlice.actions

export default chatSlice.reducer

