import React, { useState } from 'react';
import { 
    Tabs, Tab, TextField, Button, Box, Typography, Table, TableBody, IconButton,
    TableCell, TableContainer, TableHead, TableRow, Paper 
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import CircularProgress from '@mui/material/CircularProgress';

import { useDispatch, useSelector } from 'react-redux'
import { apiCall } from '../../redux/apiSlice';
import useDebounce from '../../hooks/UseDebounce';

export default function ModerationMenu() {
    const dispatch = useDispatch()
    const [tabIndex, setTabIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const loadingStates = {
      LOADING: "loading",
      DONE: "done",
      ERROR: "error"
    }
    const [loading, setLoading] = useState(loadingStates.LOADING);
    const debouncedSearchTerm = useDebounce(searchTerm, 1000);

    //moderation data fetching state
    let [modData, setModData] = React.useState({})
    let [modPromise, setModPromise] = React.useState(undefined)

    React.useEffect(()=>{
      setLoading(loadingStates.LOADING)
      let query = "%"
      if(debouncedSearchTerm != ""){
        query = debouncedSearchTerm
      }
      // perform an api call to the mod data endpoint
      const livePromise = dispatch(apiCall({
        endpoint: "moderation/list",
        data: {name: query}
      }))
      // we need to preserve this promise during rerenders if we want to abort it
      setModPromise(livePromise)
      livePromise.unwrap()
        .then(ret => {
          console.log(ret)
          //TODO: apply transformations to some fields
          setModData(ret)
          setLoading(loadingStates.DONE)
        })
        .catch(ret => {
          console.log(ret)
          setLoading(loadingStates.ERROR)
        })

      //cleanup function
      return function cleanUp(){
        modPromise?.abort()
      }
    }, [debouncedSearchTerm])


    const handleTabChange = (event, newValue) => {
        setTabIndex(newValue);
    };

    const handleRemoveBan = (callsign) => {
        console.log("Remove ban on:", callsign);
        // Implement removal logic later
    };

    return (
        <Box sx={{ p: 2 }}>
            {/* Search Bar */}
            <Box sx={{ display: 'flex', mb: 2, gap: 1, alignItems: 'center'}}>
                <TextField
                    sx={{ width: 300 }}
                    fullWidth
                    variant="outlined"
                    label="Search..."
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Box sx={{ ml: 6, display: 'flex'}}>
                  {loading == loadingStates.LOADING && (
                    <CircularProgress size="30px" />
                  )}
                  {loading == loadingStates.ERROR && (
                    <p>Loading error</p>
                  )}
                  {loading == loadingStates.DONE && (
                    <p>{(
                    modData.users.length + 
                    modData.anon_users.length +
                    modData.ban_actions.length +
                    modData.report_actions.length
                  )} results</p>
                  )}
                </Box>
            </Box>

            {/* Tabs */}
            <Tabs value={tabIndex} onChange={handleTabChange}>
                <Tab label="Moderation Logs" />
                <Tab label="Baned users" />
                <Tab label="Reports" />
            </Tabs>

            {/* Moderation Logs Tab */}
            {tabIndex === 0 && (
                <TableContainer component={Paper} sx={{ mt: 2 }} >
                    <Table size="small" >
                        <TableHead>
                            <TableRow>
                                <TableCell>Date & Time</TableCell>{/*event_timestamp: convert unix timestamp to date and time. if the date is recent, write it in the format "today", "yesterday", ... eg: "yesterday, 12:01 AM"*/}
                                <TableCell>User id</TableCell>{/*baduser_id: Integer. if 0, write "anonymous"*/}
                                <TableCell>Device</TableCell>{/*baduser_session: a long string. show the first 10 chars, and expand on hover */}
                                <TableCell>Action</TableCell>{/*is_ban_revert: boolean. translate into either "BAN" or "ban REVERT" */}
                                <TableCell>Info</TableCell>{/*moderator_id, moderator_notes: both moderator ID and moderator_notes fields, combined in a string*/}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                          {/*todo*/}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Banned users Tab */}
            {tabIndex === 1 && (
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table size="small" >
                        <TableHead>
                            <TableRow>
                                {/*this table will contain both the content of users and anon_users*/}
                                <TableCell>Callsign</TableCell>{/*users.callsign: when anon_user, set to "-"*/}
                                <TableCell>Username</TableCell>{/*users.username: when anon_user, set to "-"*/}
                                <TableCell>Identifier</TableCell>{/*users.id or anon_user.last_session*/}
                                <TableCell>Actions</TableCell>{/*This row must contain a "Revert ban" button, that does nothing*/}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {/* todo */}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Reports Tab */}
            {tabIndex === 2 && (
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table size="small" >
                        <TableHead>
                            <TableRow>
                                <TableCell>Message</TableCell>{/*badmessage_transcript: a long string. show the first 10 chars, and expand on hover*/}
                                <TableCell>Bad User ID</TableCell>{/*baduser_id: Integer. if 0, write "anonymous"*/}
                                <TableCell>Bad Device</TableCell>{/*baduser_session: a long string. show the first 10 chars, and expand on hover */}
                                <TableCell>Sent at</TableCell>{/*badmessage_timestamp: date and time. convert unix timestamp to date and time. if the date is recent, write it in the format "today", "yesterday", ... eg: "yesterday, 12:01 AM"*/}
                                <TableCell>Actions</TableCell>{/*This row must contain a "ban" button, that calls a callback with baduser_id and baduser_session */}
                                <TableCell>Reporter ID</TableCell>{/*reporter_user_id: Integer. if 0, write "anonymous"*/}
                                <TableCell>Reporter Device</TableCell>{/*reporter_session: a long string. show the first 10 chars, and expand on hover */}
                                <TableCell>Reported at</TableCell>{/*event_timestamp: date and time. convert unix timestamp to date and time. if the date is recent, write it in the format "today", "yesterday", ... eg: "yesterday, 12:01 AM"*/}
                                <TableCell>Actions</TableCell>{/*This row must contain a "ban reporter" button, that calls a callback with baduser_id and baduser_session */}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {/* todo */}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}

