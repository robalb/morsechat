import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

const initialState = {
    channel: null,
    online: [],
    chat: []
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {},
  extraReducers(builder) {
    //initial page load
    // builder.addCase(fetchAllData.fulfilled, (state, action) => {
    //   let toRet = action.payload.app
    //   return toRet
    // })
  }
})

export default chatSlice.reducer

