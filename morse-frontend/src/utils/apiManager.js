
class apiManager{
  constructor(reactAlert){
    this.reactAlert = reactAlert;
    this.cors = "";
    this.baseUrl = "http://localhost:5000/api/v1/"
  }
  async initManager(){
    let success = await this.setCors()
    if(success){
    }
  }
  async setCors(){
   
  }
  async request(url, data, cors=false){
    async function postData(url = '', data = {}, cors) {
      // Default options are marked with *
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
      return response.json(); // parses JSON response into native JavaScript objects
    }
    
    if(this.cors.length == 0)
      Throw new Error("cors-required")
    else
      return await postData(url, data, cors)
  }
}
