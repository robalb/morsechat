// components/ManualBanForm.jsx
import React, { useState } from 'react';
import {
  TextField,
  Switch,
  FormControlLabel,
  Box,
  Stack,
  Paper,
  Typography,
} from '@mui/material';
import BanButton from './BanButton'

const ManualBanForm = () => {
  const [username, setUsername] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [revert, setRevert] = useState(false);

  return (
    <Paper elevation={0} sx={{ p: 3, maxWidth: 900, minWidth: 700 }}>
      <Typography variant="h6" gutterBottom>
        Manual ban
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexDirection: 'row' }}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Device ID"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            fullWidth
            required
          />
          <FormControlLabel
            sx={{flexShrink: 0}}
            control={
              <Switch
                checked={revert}
                onChange={(e) => setRevert(e.target.checked)}
                color="primary"
              />
            }
            label="Revert Ban"
          />
          <BanButton
            sx={{flexShrink: 0}}
            type="submit"
            variant="contained"
            color={revert ? 'primary' : 'error'}
            disabled={!(username.trim() || deviceId.trim())}
            username={username}
            session={deviceId}
            revert={revert}
          >
            {revert ? 'Revert Ban' : 'Ban'}
          </BanButton>
      </Box>
    </Paper>
  );
};

export default ManualBanForm;

