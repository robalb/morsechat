import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { payloadCreatorCreator } from './apiSlice'

import { fetchAllData } from './apiSlice'

export const loginUser = createAsyncThunk(
  'user/login',
  payloadCreatorCreator("login")
  )

export const registerUser = createAsyncThunk(
  'user/register',
  payloadCreatorCreator("register")
  )

//default app settings
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
const initialState = {
  authenticated: null,
  show_popup: null,
  callsign: null,
  country: null,
  //can remain empty after api initialization
  settings: initialSettings,
  id: null,
  username: null,
  last_online: null
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {},
  extraReducers(builder) {
    //initial page load
    builder.addCase(fetchAllData.fulfilled, (state, action) => {
      let toRet = action.payload.user
      if(!toRet.settings)
        toRet.settings = initialSettings
      return toRet
    })
    //user logged in
    builder.addCase(loginUser.fulfilled, (state, action) => {
      let toRet = action.payload.user
      if(!toRet.settings)
        toRet.settings = initialSettings
      return toRet
    })
    //user registered
    builder.addCase(registerUser.fulfilled, (state, action) => {
      let toRet = action.payload.user
      if(!toRet.settings)
        toRet.settings = initialSettings
      return toRet
    })
    //..
    //logout
    //..
    //optimistic settings update
    //..
  },
})

export default userSlice.reducer
