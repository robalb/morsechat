import * as React from "react"
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import {ManageAccounts, Person, InfoOutlined} from '@mui/icons-material';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';

const CurrentUserChip = ({logged, username, handle}) => {
  let openInfoBox = () => console.log("asdasd")
  let listProps = logged ? 
    {component: "a", href:"#test"} :
    {component: "button", onClick: openInfoBox}
  return (
      <ListItemButton
        {...listProps}
        sx={{  maxWidth: 360, width:"100%", backgroundColor: "#424242"}}
        dense={true} 
        aria-label="current user info"
        >
        <ListItemAvatar>
          <Avatar>
            <Person/>
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={logged ? username : "Anonymous"}
          secondary={handle}
        />
        <Stack direction="row" alignItems="center" spacing={1}>
          {
            logged ? 
              <ManageAccounts /> :
              <InfoOutlined />
          }
        </Stack>
      </ListItemButton>
  )
}

export default CurrentUserChip
