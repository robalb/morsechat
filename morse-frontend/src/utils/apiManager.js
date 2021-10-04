
////for debugging purposes
// function sleep(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

class apiManager{
  /**
   * initialize the class attributes, 
   * and start the initialization method
   */
  constructor(reactAlert=false){
    if(reactAlert)
      this.setAlert(reactAlert)
    this.cors = "";
    this.baseUrl = "http://localhost:5000/api/v1/"
    this.alertErrorQueqe = []
    this.apiCallsQueque = []
    this.initManager()
  }
  /*
   * connect the class to a react-alert interface.
   * if there are alerts in the alertError queque display those errors
   */
  setAlert(reactAlert){
    this.reactAlert = reactAlert;
    //TODO
  }
  /**
   * attempt to
   * initialize the class, by setting the cors token.
   * if the initialization is succesfull, and there are api calls in the apiCalls queque,
   * make those api calls
   * if the initialization is unsuccesful alert an error
   */
  async initManager(){
    let success = await this.setCors()
    if(success){
    }
  }
  /*
   * makes a special api call to the backend to get the cors protection token,
   * and stores it in this.cors
   * if the call fails, it attempts to make it a second time
   */
  async setCors(){
   
  }
  /*
   * api call to a specific api endpoint
   * if the apiManager is in an uninitialized state because of authentication issues during its istantiation,
   * the call will be added to a call queque and the initmanager method will be called again
   * if the api call fails, an error is displayed
   */
  async post(endpoint, data){

  }
  /**
   * display an error or store the error message internally in a queque until
   * the class is connected to a react-error interface
   */
  alertError(error){

  }
  /*
   * internal request method
   */
  async request(url, data={}, cors=false){
    //TODO wrap in try catch(e){ return {error:"network error" details:e}}
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        'Content-Type': 'application/json',
        'X-Cors-Magic':cors
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: JSON.stringify(data) // body data type must match "Content-Type" header
    });
    //TODO wrap in try catch
    decoded = response.json(); // parses JSON response into native JavaScript objects
    
  }
}
