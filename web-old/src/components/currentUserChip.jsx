import * as React from "react"
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import {ManageAccounts, Person, InfoOutlined} from '@mui/icons-material';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

const CurrentUserChip = ({logged, username, callSign}) => {
  const [infoOpen, setInfoOpen] = React.useState(false);
  let openInfoBox = () => setInfoOpen(true)
  let closeInfoBox = () => setInfoOpen(false)

  let listProps = logged ? 
    {component: "a", href:"/user/"+username} :
    {component: "button", onClick: openInfoBox}
  return (
        <>
        <Dialog 
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        onClose={closeInfoBox}
        open={infoOpen}>
          <DialogTitle>Anonymous account</DialogTitle>
          <DialogContent>
            <DialogContentText>
              You have an anonymous account.<br/>
              Login or register to unlock custom callsigns, access to
              private rooms, and many other features.
            </DialogContentText>
          </DialogContent>
        </Dialog>

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
          secondary={callSign}
        />
        <Stack direction="row" alignItems="center" spacing={1}>
          {
            logged ? 
              <ManageAccounts /> :
              <InfoOutlined />
          }
        </Stack>
      </ListItemButton>
      </>
  )
}

export default CurrentUserChip
