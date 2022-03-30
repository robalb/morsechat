import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

import createDebouncedAsyncThunk from '../utils/createDebouncedAsyncThunk'

import { apiCall, payloadCreatorCreator } from './apiSlice'

import { fetchAllData } from './apiSlice'

export const loginUser = createAsyncThunk(
  'user/login',
  payloadCreatorCreator("login")
  )

export const registerUser = createAsyncThunk(
  'user/register',
  payloadCreatorCreator("register")
  )


export const logoutUser = createAsyncThunk(
  'user/logout',
  payloadCreatorCreator("logout")
  )

/**
 * thunk updateSettings
 * dispatch this to update the settings
 * it will immediately update the settings locally (into the store)
 * and after a debounce time will update the settings remotely (api call)
 */
export const updateSettings = createAsyncThunk(
  'user/updateSettings',
  async (data, {getState, dispatch, rejectWithValue, signal}) => {
    dispatch(userSlice.actions.updateSettingsLocal(data))
    const logged = getState().user.authenticated
    if(logged === true)
      return await dispatch(updateSettingsRemote()).unwrap()
  })

/**
 * this thunk is used internally by updateSettings
 * see updateSettings for more info
 */
const updateSettingsRemote = createDebouncedAsyncThunk(
  'user/updateSettingsRemote',
  async (_, {getState, dispatch, rejectWithValue, signal}) => {
    return await dispatch(apiCall({
      endpoint: "update_settings",
      data: getState().user.settings
    }))
  },
  1000 * 4 //4 seconds debounce
  )


//default app settings
const initialSettings = {
  wpm: 12,
  volume_receiver: 50, //0-100
  volume_key: 50, //0-100
  dialect: "asd2d2dwd",
  key_mode: "yambic", //straight / yambic
  show_readable: true,
  submit_delay: 100, //0-100
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
  reducers: {
    /**
     * this action is used interally by updateSettings
     * see updateSettings for more info
     */
    updateSettingsLocal(state, action) {
      state.settings = {
        ...state.settings,
        ...action.payload
      }
    }
  },
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
    //user logout
    builder.addCase(logoutUser.fulfilled, (state, action) => {
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
