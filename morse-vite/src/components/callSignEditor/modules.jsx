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

  //browser-only feature
  function countryCodeName(countryCode){
    const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' })
    if(countryCode)
      return regionNamesInEnglish.of(countryCode)
    return ""
  }

  return(
        <Select
          sx={{minWidth: 100, maxWidth: 250}}
          value={country}
          onChange={handleChange}
          autoWidth
          size="small"
        >
        {
          countryCodes.map((c,i) => <MenuItem key={i} value={c}> {countryCodeName(c)} </MenuItem>)
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
