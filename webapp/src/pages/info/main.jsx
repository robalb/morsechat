import * as React from 'react';
import {
  Box,
  Button,
  Container,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import pageRender from '../../pageRender/pageRender';

function InfoPage() {
  React.useEffect(() => {
    document.title = 'About - MorseChat';
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 2, sm: 6 }, bgcolor: 'background.default' }}>
      <Container maxWidth="md">
        <Paper elevation={2} sx={{ p: { xs: 2, sm: 4 } }}>
          <Typography variant="h3" component="h1" color="primary" gutterBottom>
            MorseChat
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            An online Morse code radio and chat
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="body1" paragraph>
            MorseChat lets you practice and use Morse code in real time with
            people from all over the world, without buying a radio. Pick a
            channel, press the key, and start talking.
          </Typography>

          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            How to use it
          </Typography>
          <List dense>
            <ListItem disableGutters>
              <ListItemText
                primary="1. Join a channel"
                secondary="Use the channel selector in the header. Some channels are reserved for registered users."
              />
            </ListItem>
            <ListItem disableGutters>
              <ListItemText
                primary="2. Transmit"
                secondary="Press the spacebar, or the key at the bottom of the page, for a dot. Hold it for a dash."
              />
            </ListItem>
            <ListItem disableGutters>
              <ListItemText
                primary="3. Read and listen"
                secondary="Messages can be shown as dots and dashes, or as readable text. The receiver can play each message as audio."
              />
            </ListItem>
          </List>

          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            Features
          </Typography>
          <List dense>
            <ListItem disableGutters>
              <ListItemText primary="Live channels with real-time Morse transmission" />
            </ListItem>
            <ListItem disableGutters>
              <ListItemText primary="Adjustable speed, tone, volume, and key mode" />
            </ListItem>
            <ListItem disableGutters>
              <ListItemText primary="Registered callsigns and country information" />
            </ListItem>
            <ListItem disableGutters>
              <ListItemText primary="Message reporting and moderation tools" />
            </ListItem>
          </List>

          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            Community
          </Typography>
          <Typography variant="body1" paragraph>
            Join the Discord community for help, or to take part in the
            development. The source code is available on GitHub.
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
            <Button variant="outlined" href="https://discord.gg/JPzfzNJG6e">
              Discord
            </Button>
            <Button variant="outlined" href="https://github.com/robalb/morsechat">
              GitHub
            </Button>
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
            <Button variant="contained" href="/">
              Open MorseChat
            </Button>
            <Button variant="outlined" href="/user/">
              Your profile
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            MorseChat is free and open source software. See the{' '}
            <Link href="https://github.com/robalb/morsechat/blob/main/LICENSE">
              license
            </Link>{' '}
            for details.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}

pageRender(InfoPage, { fetchData: false });
