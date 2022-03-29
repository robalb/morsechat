import { useSnackbar } from 'notistack';

import { useDispatch } from 'react-redux'
import {apiCall} from '../redux/apiSlice'

/**
 * useApi hook
 * this simply addds fancy error popups to the classic dispatch(apiCall)
 * by abstracting the apiCall dispatch, we loose the ability to cancel the 
 * associated promise as described here https://redux-toolkit.js.org/api/createAsyncThunk#canceling-while-running
 * This will lead to memory leaks
 * TODO: handle promise abort from inside this hook, with useEffect
 * @returns an apiRequest function, that will show a popup error if the api request failed
 */
export function useApi(){
  const dispatch = useDispatch()
  const { enqueueSnackbar} = useSnackbar();

  function alertError(error){
    enqueueSnackbar(error, {variant: "error", preventDuplicate:true})
  }

  return async function apiRequest({endpoint, data={}}, silent=false){
    try{
        const response = await dispatch(apiCall({
            endpoint,
            data
        })).unwrap()
        return response
    }
    catch(e){
        if(!silent)
            alertError("Operation failed. Please retry. - " + e.error)
        throw(e)
    }
  }
}

