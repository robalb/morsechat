import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

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
    chat: []
}

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
    }
  },
  extraReducers(builder) {
    //initial page load
    // builder.addCase(fetchAllData.fulfilled, (state, action) => {
    //   let toRet = action.payload.app
    //   return toRet
    // })
  }
})

export const {setChannel, setConnected} = chatSlice.actions

export default chatSlice.reducer

