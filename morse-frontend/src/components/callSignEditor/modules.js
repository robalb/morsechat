import React from 'react';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import {TextField} from '@mui/material';

import countryCodes from './countryCodes';

function ModuleCountrySelector(props) {
 const country = props.value
  const handleChange = (event) => {
    let v = event.target.value
    props.update(v)
  };
  return(
        <Select
          sx={{minWidth: 100}}
          value={country}
          hiddenLabel
          onChange={handleChange}
          autoWidth
          size="small"
        >
        {
          countryCodes.map((c,i) => <MenuItem key={i} value={c[0].substring(3)}> {c[2]} </MenuItem>)
        }
    </Select>
  )
}

function ModuleText(props){
  const re = new RegExp(props.ecmaPattern)
  const completelyValid = props.value.length == props.len && re.test(props.value)
  const handleChange = (event) => {
    let v = event.target.value
    if(v.length <= props.len && re.test(v))
    props.update(v.toUpperCase())
  }
  return (
      <FormControl sx={{maxWidth: 100}}>
        <TextField
              hiddenLabel
              error={!completelyValid}
              value={props.value}
              onChange={handleChange}
              helperText={props.description}
              size="small"
            />
      </FormControl>
  )
}


let modules = {
  country: ModuleCountrySelector,
  text: ModuleText,
}

export default modules