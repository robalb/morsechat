// components/BanButton.jsx
import React from 'react';
import { Button } from '@mui/material';
import { useDispatch } from 'react-redux';
import { apiCall } from '../../redux/apiSlice';
import { useSnackbar } from 'notistack';

const BanButton = ({ callsign="", mute=true, children, ...props }) => {
  const dispatch = useDispatch();
  const {enqueueSnackbar} = useSnackbar();
  let [apiPromise, setApiPromise] = React.useState(undefined)
  const handleClick = () => {
    const livePromise = dispatch(apiCall({
      endpoint: "moderation/mute",
      data: {
        callsign: callsign,
        mute: mute
      }
    }))

    // we need to preserve this promise during rerenders if we want to abort it
    setApiPromise(livePromise)
    livePromise.unwrap()
      .then(ret => {
        console.log(ret)
        let actionName = mute ? "MUTE successfull." : "mute REVERT succesfful"
        enqueueSnackbar(actionName, {variant: "success", preventDuplicate:true})
      })
      .catch(ret => {
        console.log(ret)
        let actionName = mute ? "MUTE failed." : "mute REVERT failed"
      enqueueSnackbar(actionName, {variant: "error", preventDuplicate:true})
      })
  };

  React.useEffect(()=>{
    return function cleanUp(){
      apiPromise?.abort()
    }
  }, [])

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
};

export default BanButton;


