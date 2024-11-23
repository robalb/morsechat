import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

import { fetchAllData } from './apiSlice'

const initialState = {
  pusher_key: null,
  pusher_cluster: null,
  pusher_host: null,
  pusher_port: null,
  rooms: {
    chat: 3,
    radio: 3
  }
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {},
  extraReducers(builder) {
    //initial page load
    builder.addCase(fetchAllData.fulfilled, (state, action) => {
      let toRet = action.payload.app
      return toRet
    })
  }
})

export default appSlice.reducer
