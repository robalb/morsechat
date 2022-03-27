import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
const initialState = []

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {},
})

export default chatSlice.reducer
