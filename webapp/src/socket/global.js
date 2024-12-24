
var socketInstance = null;

function setInstance(i){
  socketInstance = i
}

function getInstance(){
  return socketInstance
}

export {setInstance, getInstance}
