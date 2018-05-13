<?php
/**
* this script receives an ajax call from the connected users when they start typing, or when
* they stop typing and undo the transmission of the message.
* received data: status (get)
* if the session is valid, the 'startedkeying'(user started typing) or 'stoppedkeying'(user stopped typing) event is broadcasted
*
*/

session_start();
require_once('pusher/Pusher.php');
require_once('pusher/PusherException.php');
require_once('pusher/PusherInstance.php');

/*
* @global array $CONFIG - an array containig all the configuration data
*   $CONFIG = [
*    'APP_KEY'        => (string) pusher app key,
*    'APP_SECRET'     => (string) pusher app secret,
*    'APP_ID'         => (string) pusher app id,
*    'APP_CLUSTER'    => (string) pusher cluster country code,
*
*    'ADMIN_USERNAME' => (string) admin username,
*    'ADMIN_PASSWORD' => (string) admin bcript password hash,
*   
*    'MAX_CHANNELS'   => (integer) max channels aviable ,
*    'MSG_COOLDOWN'   => (integer) seconds of cooldown before a user can send messages
*   ]
*/
$CONFIG = include('config.php');

/**
* this function broadcasts the user typing status
* 
* @params string $update_string - the update string to broadcast, can be 'startedkeying' or 'stoppedkeying'
* @params array $CONFIG - the config global array
*
*/
function broadcastTypingUpdate($update_string, $CONFIG){
    $data['sender'] = $_SESSION["user_id"];
    $data['time'] = time();
        
    $options = array(
        'cluster' => $CONFIG['APP_CLUSTER'],
        'encrypted' => true
    );
    $pusher = new Pusher\Pusher(
        $CONFIG['APP_KEY'],
        $CONFIG['APP_SECRET'],
        $CONFIG['APP_ID'],
        $options
    );  
    $pusher->trigger($_SESSION["channel"], $update_string, $data);
}

  
if(!isset($_SESSION["user_id"]) ){
    //user is not logged
 	header("HTTP/1.0 401 invalid session");
	echo "invalid session";   
}
else if(!isset($_GET["status"]) ){
    //invalid parameter
    header("HTTP/1.0 403 invalid parameter");
    echo "invalid parameter";
}
//to avoid broadcasting a ton of status updates with users that stop and abort
//typing immediately after starting, the 'stopped typing' method can be called
//only after a cooldown. the other way to trigger a 'stopped typing' is by sending a message, but that's already
//controlled by a cooldown
else if(isset($_SESSION["last_update"]) && (time() - $_SESSION["last_update"] < $CONFIG['MSG_COOLDOWN'])){
    //user is sending too many updates
    header("HTTP/1.0 403 wait X seconds");
    echo "wait X seconds";    
}
else{
    //all good, broadcast the update if coerent.
    
    //user has started keying
    if($_GET["status"] === "true" && $_SESSION["keying"] === false){
        $_SESSION["keying"] = true;
        //broadcast the event       
        broadcastTypingUpdate('startedkeying', $CONFIG);
        echo "start broadcasted";
    }
    //user has stopped keying
    else if($_GET["status"] === "false" && $_SESSION["keying"] === true){
        $_SESSION["keying"] = false;
        //update cooldown timer variable
        $_SESSION["last_update"] = time();
        //broadcast the event
        broadcastTypingUpdate('stoppedkeying', $CONFIG);
        echo "stop broadcasted";
    }else{
        //invalid status
        header("HTTP/1.0 403 invalid status");
        echo "invalid status";        
    }
    
}

?>