import React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import {ListItemText, Stack, Chip, TextField, Grid, Button} from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import ErrorIcon from '@mui/icons-material/Error';

import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}


function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}


//https://www.techonthenet.com/js/language_tags.php
// <Chip label="valid callsign" icon={<DoneIcon />} size="small" color="success"/>
function SimpleEditor(){
 const [age, setAge] = React.useState('');

  const handleChange = (event) => {
    setAge(event.target.value);
  };
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} >
        <Stack direction="row" spacing={1}>
          <Typography variant="p">
            IT00HAL
          </Typography>
          <Chip label="already taken" icon={<ErrorIcon />} size="small" color="error"/>
        </Stack>
      </Grid>


      <Grid item xs={12} >
        <Select
sx={{minWidth: 100}}
          value={age}
          hiddenLabel
          onChange={handleChange}
          autoWidth
          size="small"
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          <MenuItem value={10}>IT</MenuItem>
          <MenuItem value={21}>US</MenuItem>
          <MenuItem value={22}>EN</MenuItem>
        </Select>

      <FormControl sx={{maxWidth: 100}}>
        <TextField
              hiddenLabel
              autoWidth
              size="small"
              helperText="2 numbers"
            />
      </FormControl>
      <FormControl sx={{maxWidth: 100}}>
        <TextField
              hiddenLabel
              helperText="3 letters"
              autoWidth
              size="small"
            />
      </FormControl>
      </Grid>
        </Grid>
  )

}

function CustomEditor(){
  return (
    <>
      <Grid item xs={12} >
        <TextField label="custom code" type="text" variant="standard" />
        <Button size="medium" color="secondary" variant="contained">
          Redeem
        </Button>
      </Grid>
    <Typography variant="p">
      Enter a custom code to unlock a customized editor
    </Typography>
    </>
  )
}


const CallSignEditor = () =>{
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
 return (
    <Box sx={{  width:"100%", backgroundColor: "#424242"}} >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} variant={"fullWidth"} aria-label="call sign editor">
          <Tab label="simple" {...a11yProps(0)} />
          <Tab label="custom" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <SimpleEditor />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <CustomEditor />
      </TabPanel>
    </Box>
 )
}

export default CallSignEditor
