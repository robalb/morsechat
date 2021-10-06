
////for debugging purposes
// function sleep(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

class ApiManager{
  /**
   * initialize the class attributes, 
   * and start the initialization method
   */
  constructor(reactAlert=false){
    if(reactAlert)
      this.setAlert(reactAlert)
    this.csrfToken = "";
    this.baseUrl = document.location + "api/v1/"
    this.alertErrorQueqe = []
    let success = this.initCsrfToken()
    if(success){
      console.log("apiManager: initialized")
      console.log(this)
    }
  }
  /*
   * connect the class to a react-alert interface.
   * if there are alerts in the alertError queque display those errors
   */
  setAlert(reactAlert){
    this.reactAlert = reactAlert;
    //TODO
  }
  /*
   * makes a special api call to the backend to get the csrf protection token,
   * and stores it in this.csrfToken
   */
  async initCsrfToken(){
    let url = this.baseUrl + 'csrf'
    let data = {}
    let call = await this.request(url, data)
    if( call.success && call.data.token )
      this.csrfToken = call.data.token
    else
      console.log("csrfToken init failed")
    return call.success
  }
  /*
   * api call to a specific api endpoint
   * only if the csrf token has been set
   */
  async post(endpoint, data){
    if(this.csrfToken.length > 0){
      //make request, on fail alert error
      let response = await this.request(this.baseUrl + endpoint, data)
      if(!response.success)
        this.alertError("operation failed, please retry. " + response.error)
      return response
    }
    else{
      //try to init the csrfToken again
      this.alertError("operation failed. please retry")
      this.initCsrfToken()
    }
  }
  /**
   * display an error or store the error message internally in a queque until
   * the class is connected to a react-error interface
   */
  alertError(error){
    console.log("apiManager alert:")
    console.log(error)
  }
  /*
   * internal request method.
   * any kind of error will be handled internally, this
   * merthod will always return an object in the api standard format
   * { success: false, error:errstring, details:errdetails}
   * { success: true, data:returneddata}
   * in case of connection issues for example this method will return
   * { success: false, error:'network_error'}
   */
  async request(url, data={}, csrf=false){
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
}

export default ApiManager
