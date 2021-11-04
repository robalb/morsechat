import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import {ListItemText, Stack, Chip, TextField, Grid, Button} from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import ErrorIcon from '@mui/icons-material/Error';
import FindReplaceIcon from '@mui/icons-material/FindReplace';

import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';

import modules from './modules'
import mainContext from '../../contexts/mainContext'


//https://www.techonthenet.com/js/language_tags.php
// <Chip label="valid callsign" icon={<DoneIcon />} size="small" color="success"/>
function SimpleEditor(props){
  let {post} = React.useContext(mainContext)
  let [modulesData, setModulesData] = React.useState(props.schema)

  let validationStates = {
    'GOOD': 0,
    'LOADING': 1,
    'BAD': 2,
    'NOOP': 3
  }
  let [validationState, setValidationState] = React.useState(validationStates.NOOP)

  let [validationPromise, setValidationPromise] = React.useState(undefined)

  React.useEffect(()=>{

    //abortable promise that performs a callsign validation api call
    //https://www.carlrippon.com/cancelling-fetch-in-React-and-typescript/
    //https://www.timveletta.com/blog/2020-07-14-accessing-react-state-in-your-component-cleanup-with-hooks/
    function validateCallSign(callSign){
      console.log("starting promise")
      const controller = new AbortController();
      const signal = controller.signal
      const promise = new Promise(async (resolve) =>{
          const ret = await post(
            'validate_callsign', //endpoint
            { 'callsign': callSign }, //request data
            true, //silent request
            signal //signal controller
          )
          resolve(ret)
        })
      promise.cancel = () => controller.abort();
      return promise;
    }

    //abort previous validation requests
    validationPromise?.cancel()
    //check that all values are valid
    const allValid = modulesData.every(m => {
      if(m.hasOwnProperty('len') && m.len != m.value.length)
        return false
      if(m.hasOwnProperty('ecmaPattern') && !(new RegExp(m.ecmaPattern)).test(m.value))
        return false
      return true
    })
    if(allValid){
      //pass the value of this component to the parent(this component is used in forms or similar)
      props.setData( modulesData.map(m => m.value))
      //set the state to loading, then start the online validation
      setValidationState(validationStates.LOADING)
      //make the api request:
      //launch the request promise
      let callSign = modulesData.map(m => m.value).join("")
      const livePromise = validateCallSign(callSign)
      //put the validation promise in a react state, to preserve it during rerenders
      setValidationPromise(livePromise)
      //logic following the promise resolve
      livePromise.then( ret => {
        console.log("promise resolved")
        console.log(ret)
        if(ret.success)
            setValidationState(validationStates.GOOD)
        else if(ret.error == 'already_taken')
            setValidationState(validationStates.BAD)
        else if(ret.error != 'abort_error')
          //on errors such as network errors, it's good to remove the
          //loading indicator.
          //However, abort errors indicate that a new request is takin place,
          //and the new request is taking care of the validation states.
          setValidationState(validationStates.NOOP)

      })
    }
    else{
      setValidationState(validationStates.NOOP)
    }
    //cleanup function
    return function cleanUp(){
    }
  }, [modulesData])


  //render the preview
  let preview = modulesData.map( m => {
    let ret = m.value
    if (m.hasOwnProperty("len")){
      ret += '_'.repeat(m.len - m.value.length)
    }
    if(!ret) ret = "__";
    return ret
  } ).join("")
  

  function handleUpdate(i){
    return function(newValue){
      setModulesData( originalData => {
        //make a shallow copy of the array
        let items = [...originalData]
        //make a shallow copy of the element we want to edit
        let item = {...items[i]}
        //update the data
        item.value = newValue
        //put the modified element back into the array, mutating it (it's ok cause it's a shallow copy)
        items[i] = item
        return items
      })
    }
  }

  let renderedModules = modulesData.map( (current, index) => {
        let { module, value, ...props } = current
        let Comp = modules[module]
        return <Comp value={value} update={handleUpdate(index)} {...props} />
      })

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} >
        <Stack direction="row" spacing={1}>
          <Typography variant="p">
            {preview}
          </Typography>
          { validationState == validationStates.LOADING ?
              <Chip label="checking availability" icon={<FindReplaceIcon />} size="small" /> :
            validationState == validationStates.BAD ?
              <Chip label="already taken" icon={<ErrorIcon />} size="small" color="error"/> :
            validationState == validationStates.GOOD ?
              <DoneIcon color="success" fontSize="small" /> :
            ''
          }
        </Stack>
      </Grid>

      <Grid item xs={12} >
      {renderedModules}
      </Grid>
        </Grid>
  )

}

const CallSignEditor = (props) =>{
  let {state} = React.useContext(mainContext)
  //TODO: replace this hardcoded data with data received from the apis
  //allow either a default schema or a custom schema, validated through a secret code
  const [schema, setSchema] = React.useState([
    {
      module: 'country',
      value: state.userData.country
    },
    {
      module: 'text',
      value: '',
      len: 2,
      ecmaPattern: '^[0-9]*$',
      description: "2 numbers"
    },
    {
      module: 'text',
      value: '',
      len: 3,
      ecmaPattern: '^[A-Za-z]*$',
      description: "3 letters"
    },
  ]);
  const [schemaCode,  setSchemaCode] = React.useState("hlb_base")

  function handleSetData(data){
    props.setData({
      value: data,
      code: schemaCode
    })
  }

 return (
   <>
    <SimpleEditor schema={schema} setData={handleSetData} />
    <Button size="small" variant="text" sx={{marginTop: 5}}>
     use custom code
    </Button>
    </>
 )
}

export default CallSignEditor
