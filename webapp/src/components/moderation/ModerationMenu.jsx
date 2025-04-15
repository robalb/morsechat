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
import TableCellTooltip from './TableCellTooltip.jsx'
import TableCellWithCopy from './TableCellCopy.jsx'
import BanButton from './BanButton.jsx'
import ManualBanForm from './ManualBanForm.jsx'

function formatDate(date){
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (now.toDateString() === date.toDateString()) return `today, ${date.toLocaleTimeString()}`;
    if (yesterday.toDateString() === date.toDateString()) return `yesterday, ${date.toLocaleTimeString()}`;
    return date.toLocaleString();
}

function truncate(str, maxLength){
  return str.length > maxLength ? str.slice(0, maxLength) + "…" : str;
}

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
        data: {query: query}
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
                <Tab label="Banned users" />
                <Tab label="Reports" />
                <Tab label="Manual operations" />
            </Tabs>

            {/* Moderation Logs Tab */}
            {tabIndex === 0 && (
                <TableContainer component={Paper} sx={{ mt: 2 }} >
                    <Table size="small" >
                        <TableHead>
                            <TableRow>
                                <TableCell>Date & Time</TableCell>{/*event_timestamp: convert unix timestamp to date and time. if the date is recent, write it in the format "today", "yesterday", ... eg: "yesterday, 12:01 AM"*/}
                                <TableCell>Info</TableCell>{/*moderator_id, moderator_notes: both moderator ID and moderator_notes fields, combined in a string*/}
                                <TableCell>Action</TableCell>{/*is_ban_revert: boolean. translate into either "BAN" or "ban REVERT" */}
                                <TableCell>User</TableCell>{/*baduser_id: Integer. if 0, write "anonymous"*/}
                                <TableCell>Device</TableCell>{/*baduser_session: a long string. show the first 10 chars, and expand on hover */}
                            </TableRow>
                        </TableHead>
<TableBody>
  {modData?.ban_actions?.map((action) => {
    const date = new Date(action.event_timestamp * 1000);
    return (
      <TableRow key={action.id}>
        <TableCell>{formatDate(date)}</TableCell>
        <TableCell>
          Moderator @{action.moderator_username}
          {action.moderator_notes && `: ${action.moderator_notes}`}
        </TableCell>
        <TableCell>{action.is_ban_revert ? "ban REVERT" : "BAN"}</TableCell>
        <TableCellWithCopy text={action.baduser_id === 0 ? "--" : action.baduser_username} />
        <TableCellWithCopy title={action.baduser_session} text={action.baduser_session} />
      </TableRow>
    );
  })}
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
                                <TableCell>Callsign</TableCell>
                                <TableCell>Country</TableCell>
                                <TableCell>Verified</TableCell>
                                <TableCell>Username</TableCell>
                                <TableCell>Device</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
<TableBody>
  {[...(modData?.users || []), ...(modData?.anon_users || [])].map((user, idx) => {
    const isAnon = !user.username;
    return (
      <TableRow key={isAnon ? `anon-${user.last_session}` : user.id}>
        <TableCell>{isAnon ? "-" : user.callsign}</TableCell>
        <TableCell>{isAnon ? "-" : user.country}</TableCell>
        <TableCell>{isAnon ? "-" : user.is_verified ? "YES": "no"}</TableCell>
        <TableCellWithCopy text={isAnon ? "-" : user.username} />
        <TableCellWithCopy text={isAnon ? user.last_session : "-"} />
        <TableCell>
          <BanButton variant="outlined" size="small" username={user.username} session={user.last_session} revert={true}>
            Revert ban
          </BanButton>
        </TableCell>
      </TableRow>
    );
  })}
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
                                <TableCell>Bad Message</TableCell>{/*badmessage_transcript: a long string. show the first 10 chars, and expand on hover*/}
                                <TableCell>Bad User</TableCell>{/*baduser_id: Integer. if 0, write "anonymous"*/}
                                <TableCell>Bad Device</TableCell>{/*baduser_session: a long string. show the first 10 chars, and expand on hover */}
                                <TableCell>Sent at</TableCell>{/*badmessage_timestamp: date and time. convert unix timestamp to date and time. if the date is recent, write it in the format "today", "yesterday", ... eg: "yesterday, 12:01 AM"*/}
                                <TableCell>Actions</TableCell>{/*This row must contain a "ban" button, that calls a callback with baduser_id and baduser_session */}
                                <TableCell>Reporter</TableCell>{/*reporter_user_id: Integer. if 0, write "anonymous"*/}
                                <TableCell>Reporter Device</TableCell>{/*reporter_session: a long string. show the first 10 chars, and expand on hover */}
                                <TableCell>Reported at</TableCell>{/*event_timestamp: date and time. convert unix timestamp to date and time. if the date is recent, write it in the format "today", "yesterday", ... eg: "yesterday, 12:01 AM"*/}
                                <TableCell>Actions</TableCell>{/*This row must contain a "ban reporter" button, that calls a callback with baduser_id and baduser_session */}
                            </TableRow>
                        </TableHead>
<TableBody>
  {modData?.report_actions?.map((report) => {
    const badMsgDate = new Date(report.badmessage_timestamp * 1000);
    const reportDate = new Date(report.event_timestamp * 1000);

    return (
      <TableRow key={report.id}>
        <TableCellTooltip text={report.badmessage_transcript} maxLength={30} />
        {/* <TableCell title={report.badmessage_transcript}> */}
        {/*   {truncate(report.badmessage_transcript, 30)} */}
        {/* </TableCell> */}
        <TableCellWithCopy text={report.baduser_id === 0 ? "--" : report.baduser_username} />
        <TableCellTooltip text={report.baduser_session} maxLength={20} />
        <TableCell>{formatDate(badMsgDate)}</TableCell>
        <TableCell>
          <BanButton variant="outlined" size="small" username={report.baduser_username} session={report.baduser_session} >
                        Ban
          </BanButton>
        </TableCell>
        <TableCellWithCopy text={report.reporter_user_id === 0 ? "--" : report.reporter_username} />
        <TableCellTooltip text={report.reporter_session} maxLength={20} />
        <TableCell>{formatDate(reportDate)}</TableCell>
        <TableCell>
          <BanButton variant="outlined" size="small" username={report.reporter_username} session={report.reporter_session} >
                        Ban reporter
          </BanButton>
        </TableCell>
      </TableRow>
    );
  })}
</TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Manual operations Tab */}
            {tabIndex === 3 && (
              <ManualBanForm />
            )}
        </Box>
    );
}

