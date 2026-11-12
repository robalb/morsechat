import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Tabs, Tab, TextField, Button, Box, Typography, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, Stack, Alert,
} from '@mui/material';

import CircularProgress from '@mui/material/CircularProgress';

import { useDispatch, useSelector } from 'react-redux'
import { apiCall, apiGet } from '../../redux/apiSlice';
import useDebounce from '../../hooks/UseDebounce';
import TableCellTooltip from './TableCellTooltip.jsx'
import TableCellWithCopy from './TableCellCopy.jsx'
import BanButton from './BanButton.jsx'
import ManualBanForm from './ManualBanForm.jsx'

const LOADING_STATES = {
    LOADING: "loading",
    DONE: "done",
    ERROR: "error",
};

function formatDate(date){
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '-';
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (now.toDateString() === date.toDateString()) return `today, ${date.toLocaleTimeString()}`;
    if (yesterday.toDateString() === date.toDateString()) return `yesterday, ${date.toLocaleTimeString()}`;
    return date.toLocaleString();
}

export default function ModerationMenu() {
    const dispatch = useDispatch()
    const isadmin = useSelector(state => state.user.isadmin)
    const [tabIndex, setTabIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(LOADING_STATES.LOADING);
    const debouncedSearchTerm = useDebounce(searchTerm, 1000);

    //moderation data fetching state
    const [modData, setModData] = React.useState({})
    const modPromiseRef = useRef(undefined)

    useEffect(()=>{
      setLoading(LOADING_STATES.LOADING)
      let query = "%"
      if(debouncedSearchTerm !== ""){
        query = debouncedSearchTerm
      }
      // perform an api call to the mod data endpoint
      const livePromise = dispatch(apiCall({
        endpoint: "moderation/list",
        data: {query: query}
      }))
      // we need to preserve this promise during rerenders if we want to abort it
      modPromiseRef.current = livePromise
      livePromise.unwrap()
        .then(ret => {
          setModData(ret)
          setLoading(LOADING_STATES.DONE)
        })
        .catch(ret => {
          if (ret?.error === 'abort_error') return
          setLoading(LOADING_STATES.ERROR)
        })

      //cleanup function
      return function cleanUp(){
        modPromiseRef.current?.abort()
      }
    }, [debouncedSearchTerm, dispatch])


    const handleTabChange = (event, newValue) => {
        setTabIndex(newValue);
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
                  {loading === LOADING_STATES.LOADING && (
                    <CircularProgress size="30px" />
                  )}
                  {loading === LOADING_STATES.ERROR && (
                    <p>Loading error</p>
                  )}
                  {loading === LOADING_STATES.DONE && (
                    <p>{(
                    (modData.users?.length || 0) +
                    (modData.anon_users?.length || 0) +
                    (modData.ban_actions?.length || 0) +
                    (modData.report_actions?.length || 0)
                  )} results</p>
                  )}
                </Box>
            </Box>

            {/* Tabs */}
            <Tabs value={tabIndex} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                <Tab label="Moderation Logs" />
                <Tab label="Banned users" />
                <Tab label="Reports" />
                <Tab label="Manual operations" />
                {isadmin && <Tab label="Moderators" />}
                {isadmin && <Tab label="Ban activity" />}
            </Tabs>

            {/* Moderation Logs Tab */}
            {tabIndex === 0 && (
                <TableContainer component={Paper} sx={{ mt: 2 }} >
                    <Table size="small" >
                        <TableHead>
                            <TableRow>
                                <TableCell>Date & Time</TableCell>
                                <TableCell>Info</TableCell>
                                <TableCell>Action</TableCell>
                                <TableCell>User</TableCell>
                                <TableCell>Device</TableCell>
                            </TableRow>
                        </TableHead>
                        <BanActionsTable data={modData?.ban_actions} />
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
                        <UsersTable data={{users: modData.users, anon_users: modData.anon_users}} />
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
                        <ReportActionsTable data={modData.report_actions} />
                    </Table>
                </TableContainer>
            )}

            {/* Manual operations Tab */}
            {tabIndex === 3 && (
              <ManualBanForm />
            )}

            {/* Admin-only tabs */}
            {tabIndex === 4 && isadmin && (
              <AdminModeratorsTab />
            )}
            {tabIndex === 5 && isadmin && (
              <AdminBanActivityTab />
            )}
        </Box>
    );
}


const BanActionsTable = React.memo(({ data }) => {
  return (
    <TableBody>
      {data?.map((action) => {
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
  );
});

const UsersTable = React.memo(({ data }) => {
  return (
  <TableBody>
    {[...(data?.users || []), ...(data?.anon_users || [])].map((user, idx) => {
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
  );

});

const ReportActionsTable = React.memo(({ data }) => {
  return (
    <TableBody>
      {data?.map((report) => {
        const badMsgDate = new Date(report.badmessage_timestamp * 1000);
        const reportDate = new Date(report.event_timestamp * 1000);

        return (
          <TableRow key={report.id}>
            <TableCellTooltip text={report.badmessage_transcript} maxLength={30} />
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
  )
});

/**
 * Admin-only tab: list moderators and promote/demote accounts.
 */
const AdminModeratorsTab = () => {
  const dispatch = useDispatch()
  const [moderators, setModerators] = useState([])
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [updating, setUpdating] = useState(false)
  const requestRef = useRef(undefined)

  const loadModerators = useCallback(async () => {
    setLoading(true)
    setError('')
    const promise = dispatch(apiGet({ endpoint: "admin/list_moderators" }))
    requestRef.current = promise
    try {
      const ret = await promise.unwrap()
      setModerators(ret.moderators || [])
    } catch (err) {
      if (err?.name !== 'AbortError' && err?.error !== 'abort_error') {
        setError(err?.error || err?.message || 'loading error')
      }
    } finally {
      setLoading(false)
    }
  }, [dispatch])

  useEffect(() => {
    loadModerators()
    return () => requestRef.current?.abort()
  }, [loadModerators])

  async function updateModerator(name, promote) {
    const trimmed = name.trim()
    if (trimmed.length < 3) {
      setError('username must be at least 3 characters')
      return
    }
    setError('')
    setNotice('')
    setUpdating(true)
    try {
      await dispatch(apiCall({
        endpoint: promote ? "admin/set_moderator" : "admin/remove_moderator",
        data: { username: trimmed },
      })).unwrap()
      setNotice(promote
        ? `${trimmed} is now a moderator`
        : `${trimmed} is no longer a moderator`)
      if (promote) setUsername('')
      await loadModerators()
    } catch (err) {
      setError(err?.error || 'update failed')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Paper elevation={0} sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Moderators
      </Typography>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <TextField
          label="Username"
          size="small"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{ minWidth: 260 }}
        />
        <Button
          variant="contained"
          disabled={updating}
          onClick={() => updateModerator(username, true)}
        >
          Promote
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}
      {loading ? (
        <CircularProgress size="30px" />
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Callsign</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Verified</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {moderators.map((moderator) => (
                <TableRow key={moderator.id}>
                  <TableCellWithCopy text={moderator.username} />
                  <TableCell>{moderator.callsign}</TableCell>
                  <TableCell>{moderator.country}</TableCell>
                  <TableCell>{moderator.is_verified ? "YES" : "no"}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      color="warning"
                      disabled={updating}
                      onClick={() => updateModerator(moderator.username, false)}
                    >
                      Demote
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {moderators.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No moderators</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  )
}

/**
 * Admin-only tab: read the global ban activity log.
 */
const AdminBanActivityTab = () => {
  const dispatch = useDispatch()
  const [query, setQuery] = useState('')
  const [banActions, setBanActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const debouncedQuery = useDebounce(query, 1000)
  const requestRef = useRef(undefined)

  useEffect(() => {
    setLoading(true)
    setError('')
    const promise = dispatch(apiGet({
      endpoint: "admin/list_ban_activity",
      data: { query: debouncedQuery === '' ? '%' : debouncedQuery },
    }))
    requestRef.current = promise
    promise.unwrap()
      .then(ret => setBanActions(ret.ban_actions || []))
      .catch(err => {
        if (err?.name !== 'AbortError' && err?.error !== 'abort_error') {
          setError(err?.error || err?.message || 'loading error')
        }
      })
      .finally(() => setLoading(false))
    return () => requestRef.current?.abort()
  }, [debouncedQuery, dispatch])

  return (
    <Paper elevation={0} sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Ban activity
      </Typography>
      <TextField
        label="Search..."
        size="small"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 2, width: 300 }}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <CircularProgress size="30px" />
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date & Time</TableCell>
                <TableCell>Info</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Device</TableCell>
              </TableRow>
            </TableHead>
            <BanActionsTable data={banActions} />
          </Table>
        </TableContainer>
      )}
    </Paper>
  )
}
