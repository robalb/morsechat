import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

import {request, baseApiUrl} from '../utils/apiResolver'

/**
* thunk fetchAllData
* This is called when the application renders for the first time
* makes an api call to page_init, that returns the initial state of several slices.
* Every slice that needs initialization from this state must register to this
* thunk via an extrareducer
*/
export const fetchAllData = createAsyncThunk(
  'api/fetchAllData',
  payloadCreatorCreator("sess_init")
  )


/**
 * 
 * @param {string} endpoint - the api endpoint to call
 * @param {function} beforeRequest - an action that will be performed before starting
 *                                   the request
 * @returns function - a redux thunk payloadCreator function
 */
export function payloadCreatorCreator(endpoint, beforeRequest=null){
  return async (data={}, {getState, rejectWithValue, signal}) => {
    if(beforeRequest)
      beforeRequest(data)
    const csrf = false
    const response = await request(baseApiUrl + endpoint, data, csrf, signal)
    if(response.error){
      return rejectWithValue({
        error: response.error,
        details: response.details
      })
    }else{
      return response;
    }
  }
}

/**
 * thunk apiCall
 * Makes an authenticated api call
 * Usage example:
 * <code>
      return response.data;
 * dispatch(apiCall({
 *  endpoint: "asd",
 *  data: {}
 * }))
 * .unwrap()
 * .then(succesfulApiResponse =>{})
 * </code>
 */
export const apiCall = createAsyncThunk(
  'api/call',
  async ({endpoint, data={}}, {getState, rejectWithValue, signal}) => {
    const csrf = getState().api.csrf
    const response = await request(baseApiUrl + endpoint, data, csrf, signal)
    if(response.error){
      return rejectWithValue({
        error: response.error,
        details: response.details
      })
    }else{
      return response;
    }
})

export const morseCall = createAsyncThunk(
  'api/morsecall',
  async ({endpoint, data={}}, {getState, rejectWithValue, signal}) => {
    const csrf = getState().api.csrf
    const response = await request(baseApiUrl + endpoint, data, csrf, signal)
    if(response.error){
      return rejectWithValue({
        error: response.error,
        details: response.details
      })
    }else{
      return response;
    }
})


const initialState = {
  loading: true,
  error: "",
  errorDetails: ""
}

const apiSlice = createSlice({
  name: 'api',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder.addCase(fetchAllData.fulfilled, (state, action) => {
      state.loading = false
      state.error = ""
      state.errorDetails = ""
    })
    builder.addCase(fetchAllData.rejected, (state, action) => {
      //set the app in an error state only if it is not loading.
      //note: the loading state is set as an initial state, there are no actions
      //that set the state as loading
      if(state.loading){
        state.error = action.payload.error
        state.errorDetails = action.payload.details
      }
    })
  },
})

export default apiSlice.reducer

