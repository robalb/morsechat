  /*
   * internal request method.
   * any kind of error will be handled internally, this
   * merthod will always return an object in the api standard format
   * { success: false, error:errstring, details:errdetails}
   * { success: true, data:returneddata}
   * in case of connection issues for example this method will return
   * { success: false, error:'network_error'}
   */
 export async function request(url, data={}, csrf=false){
    let response = {}
    //prepare request headers
    let headers = {
      'Content-Type': 'application/json',
    }
    if(csrf) headers['X-Csrf-Magic'] = csrf
    //attempt to make an api call.
    try{
      response = await fetch(url, {
        method: 'POST',
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'include', // include, *same-origin, omit
        headers: headers,
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: JSON.stringify(data) // body data type must match "Content-Type" header
      });
    }
    catch(e){
      return {
        success: false,
        error: 'network_error',
        details: e
      }
    }
    //attempt to decode the api response into an object
    try{
      response = await response.json(); // parses JSON response into native JavaScript objects
    }
    catch(e){
      return {
        success: false,
        error: 'response_data_error',
        details: e
      }
    }
    //TODO: validate the decoded object content, ex: must contain success key
    //if all was right, return the decoded response object
    return response
  }

