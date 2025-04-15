// components/BanButton.jsx
import React from 'react';
import { Button } from '@mui/material';
import { useDispatch } from 'react-redux';
import { openDialog } from '../../redux/dialogSlice';

const BanButton = ({ username="", session="", revert=false, children, ...props }) => {
  const dispatch = useDispatch();
  const handleClick = () => {
    dispatch(openDialog({username, session, revert}));
  };

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
};

export default BanButton;

