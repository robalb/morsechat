import { configureStore, createAsyncThunk } from '@reduxjs/toolkit'

import accountReducer from './accountSlice'
import chatReducer from './chatSlice'

//creiamo 2 thunks: loadAccountData, setAccountData
// https://stackoverflow.com/questions/66613260/how-to-dispatch-asyncthunk-inside-another-asyncthunk
// ogni slice registra negli extraReducers loadAccountData, e aggiorna il proprio stato usando la
// parte di dati restituita che gli interessa

//capire come classficare questo, in che slice o file metterlo visto che diverse slices lo ascoltano
export const fetchUsers = createAsyncThunk('users/fetchUsers', async (arg, {getState}) => {
    //qui si puo fare fetch alle api, nota che abbiamo accesso allo stato. posiamo leggere csrf o auth tokens
    //https://stackoverflow.com/questions/67338431/can-i-access-state-inside-a-createasyncthunk-w-axios-with-redux-toolkit
    // per quanto riguarda il salvare csrf nello stato, si può creare una slice api che ascolta su questo thunk
    //   const response = await client.get('/fakeApi/users')
    //   return response.data
    return 42
})

// https://redux-toolkit.js.org/api/createSlice#extrareducers
export default configureStore({
  reducer: {
    account: accountReducer,
    chat: chatReducer
  },
})