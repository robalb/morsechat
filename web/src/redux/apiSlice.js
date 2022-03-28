import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

import {request, baseApiUrl} from '../utils/apiResolver'

//capire come classficare questo, in che slice o file metterlo visto che diverse slices lo ascoltano
export const fetchUsers = createAsyncThunk('users/fetchUsers', async (arg, {getState}) => {
    //qui si puo fare fetch alle api, nota che abbiamo accesso allo stato. posiamo leggere csrf o auth tokens
    //https://stackoverflow.com/questions/67338431/can-i-access-state-inside-a-createasyncthunk-w-axios-with-redux-toolkit
    //https://stackoverflow.com/questions/63439021/handling-errors-with-redux-toolkit
    // per quanto riguarda il salvare csrf nello stato, si può creare una slice api che ascolta su questo thunk
    //   const response = await client.get('/fakeApi/users')
    //   return response.data
    return 42
})

/**
* thunk fetchAllData
* This is called when the application renders for the first time
* makes an api call to page_init, that returns the initial state for every app slice
* Every slice that needs initialization from this state must register to this
* thunk via an extrareducer
*/
export const fetchAllData = createAsyncThunk(
  'api/fetchAllData',
  async (arg, {getState, rejectWithValue, signal}) => {
    const endpoint = "";
    const data = {}
    const response = await request(baseApiUrl + endpoint, data, csrf, signal)
    if(response.success)
      return response.data;
    return rejectWithValue({
      error: response.error,
      details: response.details
    })
})


const initialState = {
  csrf: null,
  //the app did an api call - this is set to false after the first api call
  didAnApiCall: true
}

const apiSLice = createSlice({
  name: 'api',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder.addCase(fetchAllData.fulfilled, (state, action) => {
      //save csrf and update didanapicall
      return action.payload
    })
    builder.addCase(fetchAllData.rejected, (state, action) => {
      //update didanapicall
      return action.payload
    })
  },
})

export default apiSLice.reducer

