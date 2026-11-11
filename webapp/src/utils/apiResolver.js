
  //This is a VITE env variable
  // https://vitejs.dev/guide/env-and-mode.html
  const IS_PRODUCTION = import.meta.env.PROD

  /**
   * Api endpoint url
   */
  export const baseApiUrl = IS_PRODUCTION ?
    '/api/v1/' :
    'http://localhost:8080/api/v1/'

  /**
   * websocket url
   */
  export const wsUrl = IS_PRODUCTION ?
    `wss://${window.location.host}/ws/init` :
    'http://localhost:8080/ws/init'


  /**
   * Internal request method.
   *
   * Any kind of error will be handled internally, this
   * function will always return an object in the following format
   * { success: false, error:errstring, details:errdetails}
   * { success: true, data:returneddata}
   * in case of connection issues for example this method will return
   * { success: false, error:'network_error'}
   *
   * here is the complete list of errors this function could return:
   * network_error -The http request failed. This could happen because of CORS, or connection issues
   * server_error  -The server responded with something unexpected: invalid json, or an http response
   *                code different than 200. For help in debugging this issue you can check the details
   *                string
   * abort_error   -The request was aborted internally in the app logic by an abortcontroller
   *
   * other errors are defined by every api endpoint. common ones are
   * bad_schema
   * unauthorized
   *
   * GET requests serialize the data object into the query string, while all
   * other methods send it as a JSON body.
   */
 export async function request(url, data={}, csrf=false, signal=false, method='POST'){
   let optional = {}
   if(signal) optional.signal = signal

    const upperMethod = method.toUpperCase()
    let requestUrl = url
    let body = null
    if(upperMethod === 'GET'){
      const params = new URLSearchParams()
      Object.entries(data || {}).forEach(([key, value]) => {
        if(value !== undefined && value !== null)
          params.append(key, value)
      })
      const query = params.toString()
      if(query)
        requestUrl += (url.includes('?') ? '&' : '?') + query
    }else{
      body = JSON.stringify(data)
    }

    let response = {}
    //prepare request headers
    let headers = {}
    if(body !== null) headers['Content-Type'] = 'application/json'
    if(csrf) headers['X-Csrf-Magic'] = csrf
    //attempt to make an api call.
    try{
      response = await fetch(requestUrl, {
        ...optional,
        method: upperMethod,
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'include', // include, *same-origin, omit
        headers: headers,
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: body // body data type must match "Content-Type" header
      });
    }
    catch(e){
      if(e.name === "AbortError")
        return {
          success: false,
          error: 'abort_error',
          details: ''
        }
      return {
        success: false,
        error: 'network_error',
        details: e.message
      }
    }
    //attempt to decode the api response into an object
    try{
      response = await response.json(); // parses JSON response into native JavaScript objects
    }
    catch(e){
      //handle responses with a status different from 200
      if(response.status != 200){
        return {
          success: false,
          error: 'server_error',
          details: "server returned status code: " + response.status
        }
      }else{
        return {
          success: false,
          error: 'server_error',
          details: "server status is 200, but json parse failed"
        }
      }
    }
    //TODO: validate the decoded object content, ex: must contain success key
    //if all was right, return the decoded response object
    return response
  }

