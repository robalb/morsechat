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
          console.log("5555555555555")
          console.log(ret)
          setModData(ret)
          setLoading(loadingStates.DONE)
          //TODO
        })
        .catch(ret => {
          console.log("4444444444444")
          console.log(ret)
          setLoading(loadingStates.ERROR)
        })

      //cleanup function
      return function cleanUp(){
        modPromise?.abort()
      }
    }, [debouncedSearchTerm])

    // Placeholder Data
    let moderationLogs = [
        { date: '2025-03-23 10:00', moderator: 'ModA', action: 'Deleted inappropriate message' },
        { date: '2025-03-23 10:00', moderator: 'ModA', action: 'Deleted inappropriate message' },
        { date: '2025-03-23 11:15', moderator: 'ModB', action: 'Issued warning to UserX' },
        { date: '2025-03-23 10:00', moderator: 'ModA', action: 'Deleted inappropriate message' },
        { date: '2025-03-23 11:15', moderator: 'ModB', action: 'Issued warning to UserX' },
        { date: '2025-03-23 10:00', moderator: 'ModA', action: 'Deleted inappropriate message' },
        { date: '2025-03-23 11:15', moderator: 'ModB', action: 'Issued warning to UserX' },
        { date: '2025-03-23 10:00', moderator: 'ModA', action: 'Deleted inappropriate message' },
        { date: '2025-03-23 11:15', moderator: 'ModB', action: 'Issued warning to UserX' },
        { date: '2025-03-23 10:00', moderator: 'ModA', action: 'Deleted inappropriate message' },
        { date: '2025-03-23 11:15', moderator: 'ModB', action: 'Issued warning to UserX' },
        { date: '2025-03-23 10:00', moderator: 'ModA', action: 'Deleted inappropriate message' },
        { date: '2025-03-23 11:15', moderator: 'ModB', action: 'Issued warning to UserX' },
        { date: '2025-03-23 10:00', moderator: 'ModA', action: 'Deleted inappropriate message' },
        { date: '2025-03-23 11:15', moderator: 'ModB', action: 'Issued warning to UserX' },
        { date: '2025-03-23 10:00', moderator: 'ModA', action: 'Deleted inappropriate message' },
        { date: '2025-03-23 11:15', moderator: 'ModB', action: 'Issued warning to UserX' },
        { date: '2025-03-23 10:00', moderator: 'ModA', action: 'Deleted inappropriate message' },
        { date: '2025-03-23 11:15', moderator: 'ModB', action: 'Issued warning to UserX' },
        { date: '2025-03-23 10:00', moderator: 'ModA', action: 'Deleted inappropriate message' },
        { date: '2025-03-23 11:15', moderator: 'ModB', action: 'Issued warning to UserX' },
        { date: '2025-03-23 10:00', moderator: 'ModA', action: 'Deleted inappropriate message' },
        { date: '2025-03-23 11:15', moderator: 'ModB', action: 'Issued warning to UserX' },
        { date: '2025-03-23 10:00', moderator: 'ModA', action: 'Deleted inappropriate message' },
        { date: '2025-03-23 11:15', moderator: 'ModB', action: 'Issued warning to UserX' },
        { date: '2025-03-23 10:00', moderator: 'ModA', action: 'Deleted inappropriate message' },
        { date: '2025-03-23 11:15', moderator: 'ModB', action: 'Issued warning to UserX' },
        { date: '2025-03-23 11:15', moderator: 'ModB', action: 'Issued warning to UserX' },
    ];
    moderationLogs = []

    const bans = [
        { callsign: 'Alpha1', username: 'UserAlpha', date: '2025-03-22 09:00', reason: 'Spam', deviceId: 'device123' },
        { callsign: 'Bravo2', username: 'UserBravo', date: '2025-03-21 14:30', reason: 'Toxic behavior', deviceId: 'device456' },
    ];

    const reports = [
        { date: '2025-03-23 08:45', callsign: 'Charlie3', username: 'UserCharlie', badMessage: 'Offensive text', deviceId: 'device789', reporterCallsign: 'Delta4', reporterUsername: 'UserDelta', reporterDeviceId: 'device101' },
        { date: '2025-03-23 09:20', callsign: 'Echo5', username: 'UserEcho', badMessage: 'Harassment', deviceId: 'device202', reporterCallsign: 'Foxtrot6', reporterUsername: 'UserFoxtrot', reporterDeviceId: 'device303' },
    ];

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
                <Tab label="Bans" />
                <Tab label="Reports" />
            </Tabs>

            {/* Moderation Logs Tab */}
            {tabIndex === 0 && (
                <TableContainer component={Paper} sx={{ mt: 2 }} >
                    <Table size="small" >
                        <TableHead>
                            <TableRow>
                                <TableCell>Date & Time</TableCell>
                                <TableCell>Moderator</TableCell>
                                <TableCell>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {moderationLogs.map((log, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{log.date}</TableCell>
                                    <TableCell>{log.moderator}</TableCell>
                                    <TableCell>{log.action}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Bans Tab */}
            {tabIndex === 1 && (
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Callsign</TableCell>
                                <TableCell>Username</TableCell>
                                <TableCell>Date & Time</TableCell>
                                <TableCell>Ban Reason</TableCell>
                                <TableCell>Device ID</TableCell>
                                <TableCell>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {bans.map((ban, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{ban.callsign}</TableCell>
                                    <TableCell>{ban.username}</TableCell>
                                    <TableCell>{ban.date}</TableCell>
                                    <TableCell>{ban.reason}</TableCell>
                                    <TableCell>{ban.deviceId}</TableCell>
                                    <TableCell>
                                        <Button 
                                            variant="outlined" 
                                            size="small"
                                            color="error"
                                            onClick={() => handleRemoveBan(ban.callsign)}
                                        >
                                            Remove Ban
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Reports Tab */}
            {tabIndex === 2 && (
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date & Time</TableCell>
                                <TableCell>Callsign</TableCell>
                                <TableCell>Username</TableCell>
                                <TableCell>Bad Message</TableCell>
                                <TableCell>Device ID</TableCell>
                                <TableCell>Reporter Callsign</TableCell>
                                <TableCell>Reporter Username</TableCell>
                                <TableCell>Reporter Device ID</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reports.map((report, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{report.date}</TableCell>
                                    <TableCell>{report.callsign}</TableCell>
                                    <TableCell>{report.username}</TableCell>
                                    <TableCell>{report.badMessage}</TableCell>
                                    <TableCell>{report.deviceId}</TableCell>
                                    <TableCell>{report.reporterCallsign}</TableCell>
                                    <TableCell>{report.reporterUsername}</TableCell>
                                    <TableCell>{report.reporterDeviceId}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}

