import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'

import createDebouncedAsyncThunk from '../utils/createDebouncedAsyncThunk'

import { apiCall, payloadCreatorCreator } from './apiSlice'

import { fetchAllData } from './apiSlice'

export const loginUser = createAsyncThunk(
  '/login',
  payloadCreatorCreator("login")
  )

export const registerUser = createAsyncThunk(
  '/register',
  payloadCreatorCreator("register")
  )


export const logoutUser = createAsyncThunk(
  '/logout',
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
  wpm: 12, //5-50
  volume_receiver: 50, //0-100
  volume_key: 50, //0-100
  dialect: "international",
  key_mode: "straight", //straight - yambic
  show_readable: true,
  left_is_dot: true,
  submit_delay: 12, //5-50
  keybinds: {
    straight: "c",
    yambic_left: "z",
    yambic_right: "x",
    cancel_message: "p",
  }
}
const initialState = {
  authenticated: null,
  isadmin: false,
  ismoderator: false,
  callsign: null,
  country: null,
  //can remain empty after api initialization
  settings: initialSettings,
  id: null,
  username: null,
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
      let apidata = action.payload
      state.authenticated = !apidata.is_anonymous
      state.callsign = apidata.callsign
      state.country = apidata.country
      state.isadmin = apidata.is_admin
      state.ismoderator = apidata.is_moderator
      state.username = apidata.username
      if(apidata.settings)
        state.settings = apidata.settings
    })
    //user logged in
    builder.addCase(loginUser.fulfilled, (state, action) => {
      let apidata = action.payload
      state.authenticated = !apidata.is_anonymous
      state.callsign = apidata.callsign
      state.country = apidata.country
      state.username = apidata.username
      if(apidata.settings)
        state.settings = apidata.settings
    })
    //user registered
    builder.addCase(registerUser.fulfilled, (state, action) => {
      let apidata = action.payload
      state.authenticated = !apidata.is_anonymous
      state.callsign = apidata.callsign
      state.country = apidata.country
      state.username = apidata.username
    })
    //user logout
    builder.addCase(logoutUser.fulfilled, (state, action) => {
      let apidata = action.payload
      state.authenticated = !apidata.is_anonymous
      state.callsign = apidata.callsign
      state.country = apidata.country
      state.username = apidata.username
    })
    //..
    //logout
    //..
    //optimistic settings update
    //..
  },
})


export const wpmToMorseTimes = wpm => {
  if (wpm < 1) wpm = 1
  if (wpm > 200) wpm = 200
  const dotTime = Math.ceil(1200 / wpm)
  return {
    dot: dotTime,
    dash: dotTime * 3,
    elementGap: dotTime,
    letterGap: dotTime * 3,
    wordGap: dotTime * 7
  }
}

export const selectMorseTimes = createSelector(
  state => state.user.settings.wpm,
  wpmToMorseTimes
)

export default userSlice.reducer
