import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
// import { client } from '../../api/client'

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

// export const fetchUsers = createAsyncThunk('users/fetchUsers', async () => {
//   const response = await client.get('/fakeApi/users')
//   return response.data
// })

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {},
//   extraReducers(builder) {
//     builder.addCase(fetchUsers.fulfilled, (state, action) => {
//       return action.payload
//     })
//   },
})

export default userSlice.reducer
