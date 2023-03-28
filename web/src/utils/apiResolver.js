import Pusher from 'pusher-js';

  //This is a VITE env variable
  // https://vitejs.dev/guide/env-and-mode.html
  const IS_PRODUCTION = import.meta.env.PROD

  /**
   * Api endpoint url
   */
  export const baseApiUrl = IS_PRODUCTION ?
    '/api/v1/' :
    'http://localhost:5000/api/v1/'

  /**
   * pusher authentication endpoint url
   */
  const pusherAuthUrl = baseApiUrl + 'pusher_auth'

  /**
  * Pusher client generator
  */
  export function pusherClient(csrf, key, host, port, cluster){
    if(!IS_PRODUCTION)
      Pusher.logToConsole = true;

    let pusher = new Pusher(key, {
      cluster: cluster,
      authorizer: authorizer,
      wsHost: host,
      wsPort: port,
      forceTLS: false,
      encrypted: false,
      disableStats: true,
      enabledTransports: ['ws', 'wss']
    });

    /**
     * Pusher custom authorizer function,
     * replaces the pusher internal fetch function with the request function
     * used for api requests in this app
     * https://github.com/pusher/pusher-js#authorizer-function 
     *
     */
    function authorizer (channel, options) {
        return {
          authorize: async function (socketId, callback) {
            let body = {
              socket_id: socketId,
              channel_name: channel.name
            }
            let res = await request(pusherAuthUrl, body, csrf)
            if (res.success) {
              callback(null, res.data);
            }
            else {
              callback(new Error(res.error + " " + res.details), { auth: "" });
            }
          }
      };
    }

    return pusher;
  }

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
   */
 export async function request(url, data={}, csrf=false, signal=false){
   let optional = {}
   if(signal) optional.signal = signal

    let response = {}
    //prepare request headers
    let headers = {
      'Content-Type': 'application/json',
    }
    if(csrf) headers['X-Csrf-Magic'] = csrf
    //attempt to make an api call.
    try{
      response = await fetch(url, {
        ...optional,
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
    //handle responses with a status different from 200
    if(response.status != 200){
      return {
        success: false,
        error: 'server_error',
        details: "server returned status code: " + response.status
      }
    }
    //attempt to decode the api response into an object
    try{
      response = await response.json(); // parses JSON response into native JavaScript objects
    }
    catch(e){
      return {
        success: false,
        error: 'server_error',
        details: "server status is 200, but json parse failed"
      }
    }
    //TODO: validate the decoded object content, ex: must contain success key
    //if all was right, return the decoded response object
    return response
  }

