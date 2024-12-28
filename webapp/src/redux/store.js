import { configureStore, createAsyncThunk } from '@reduxjs/toolkit'

import userReducer from './userSlice'
import apiReducer from './apiSlice'
import chatReducer from './chatSlice'

// This is the entry point to the redux-toolkit store of the webapp
// It's an untyped, entangled mess I created a long time ago.
// If you are trying to undestand it, feel free to contact me:
// I'll be happy to recommend you better ways to waste your time.

// https://redux-toolkit.js.org/api/createSlice#extrareducers

export default configureStore({
  reducer: {
    user: userReducer,
    api: apiReducer,
    chat: chatReducer
  },
})

