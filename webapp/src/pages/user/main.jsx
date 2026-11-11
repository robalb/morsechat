import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useDispatch, useSelector } from 'react-redux';
import pageRender from '../../pageRender/pageRender';
import { apiCall, apiGet } from '../../redux/apiSlice';

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

function UserPage() {
  const dispatch = useDispatch();
  const loading = useSelector((state) => state.api.loading);
  const authenticated = useSelector((state) => state.user.authenticated);
  const ownUsername = useSelector((state) => state.user.username);
  const ownCallsign = useSelector((state) => state.user.callsign);
  const ownCountry = useSelector((state) => state.user.country);
  const isadmin = useSelector((state) => state.user.isadmin);
  const ismoderator = useSelector((state) => state.user.ismoderator);
  const settings = useSelector((state) => state.user.settings);

  const [profile, setProfile] = React.useState(null);
  const [error, setError] = React.useState('');
  const [profileLoading, setProfileLoading] = React.useState(true);

  const params = new URLSearchParams(window.location.search);
  const requestedUsername = params.get('username') || '';
  const isOwnProfile = !requestedUsername || requestedUsername === ownUsername;

  React.useEffect(() => {
    document.title = isOwnProfile ? 'Your profile - MorseChat' : `${requestedUsername} - MorseChat`;
  }, [isOwnProfile, requestedUsername]);

  React.useEffect(() => {
    if (loading) return;
    if (!authenticated) {
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setError('');
    let promise;
    if (isOwnProfile) {
      promise = dispatch(apiGet({ endpoint: 'user/me' }));
    } else {
      promise = dispatch(apiCall({
        endpoint: 'user/info',
        data: { username: requestedUsername },
      }));
    }

    promise.unwrap()
      .then((ret) => setProfile(ret))
      .catch((err) => {
        if (err?.error === 'abort_error') return;
        setError(err?.error || 'Could not load the profile');
      })
      .finally(() => setProfileLoading(false));

    return () => promise.abort();
  }, [authenticated, dispatch, isOwnProfile, loading, requestedUsername]);

  let content;

  if (loading || (authenticated && profileLoading)) {
    content = (
      <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
        <CircularProgress />
        <Typography>Loading profile…</Typography>
      </Stack>
    );
  } else if (!authenticated) {
    content = (
      <Stack spacing={2}>
        <Alert severity="info">
          You need an account to view profiles. You can still join the chat
          anonymously.
        </Alert>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" href="/">Back to chat</Button>
        </Stack>
      </Stack>
    );
  } else if (error) {
    content = (
      <Stack spacing={2}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" href="/user/">Back to your profile</Button>
      </Stack>
    );
  } else {
    const data = profile || {};
    const username = data.username || (isOwnProfile ? ownUsername : requestedUsername);
    const callsign = data.callsign || (isOwnProfile ? ownCallsign : '');
    const country = data.country || (isOwnProfile ? ownCountry : '');
    const showOwnRoles = isOwnProfile;

    content = (
      <Stack spacing={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <AccountCircleIcon color="primary" sx={{ fontSize: 64 }} />
          <Box>
            <Typography variant="h4" component="h1">
              {username}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Callsign: {callsign || 'unknown'}
            </Typography>
          </Box>
        </Stack>

        {(showOwnRoles && (isadmin || ismoderator)) && (
          <Stack direction="row" spacing={1}>
            {isadmin && <Chip label="Admin" color="error" />}
            {ismoderator && <Chip label="Moderator" color="primary" />}
          </Stack>
        )}

        <Divider />

        <Box>
          <Typography variant="h6" gutterBottom>Account</Typography>
          <Typography><strong>Username:</strong> {username || 'unknown'}</Typography>
          <Typography><strong>Callsign:</strong> {callsign || 'unknown'}</Typography>
          <Typography><strong>Country:</strong> {country || 'unknown'}</Typography>
          <Typography><strong>Registered:</strong> {formatTimestamp(data.registration_timestamp)}</Typography>
          <Typography><strong>Last online:</strong> {formatTimestamp(data.last_online_timestamp)}</Typography>
        </Box>

        {isOwnProfile && settings && (
          <>
            <Divider />
            <Box>
              <Typography variant="h6" gutterBottom>Preferences</Typography>
              <Typography><strong>Speed:</strong> {settings.wpm} WPM</Typography>
              <Typography><strong>Tone:</strong> {settings.key_frequency} Hz</Typography>
              <Typography><strong>Dialect:</strong> {settings.dialect}</Typography>
              <Typography><strong>Key mode:</strong> {settings.key_mode}</Typography>
              <Typography><strong>Show readable text:</strong> {settings.show_readable ? 'yes' : 'no'}</Typography>
            </Box>
          </>
        )}

        <Divider />

        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
          <Button variant="contained" href="/">Back to chat</Button>
          {!isOwnProfile && (
            <Button variant="outlined" href="/user/">Your profile</Button>
          )}
          <Button variant="text" href="/info/">About MorseChat</Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 2, sm: 6 }, bgcolor: 'background.default' }}>
      <Container maxWidth="sm">
        <Paper elevation={2} sx={{ p: { xs: 2, sm: 4 } }}>
          {content}
        </Paper>
      </Container>
    </Box>
  );
}

pageRender(UserPage);
