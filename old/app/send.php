<?php
/**
* this script receives an ajax call from the connected users when they send a message.
* received data: msg (get)
* if the session is valid, the message is broadcasted.
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
* this function validates the msg recived
* 
* @params string $msg - the msg to validate
*
* @return boolean
*/
function validateMsg($msg){
    //removes double spaces
    $msg = str_replace("JJ","J",$_GET["msg"]);
    //removes initial spaces
    $msg = ltrim($msg,"J");
    
    $valid_length = (strlen($msg) > 0 && strlen($msg) < 400);
    $valid_format = preg_match('/^[a-zA-Z0-9]+$/', $msg);
    return ($valid_length && $valid_format);
}


if(!isset($_SESSION["user_id"]) ){
    //user is not logged
    header("HTTP/1.0 401 invalid session");
    echo "invalid session";    
}
else if(isset($_SESSION["last_msg"]) && (time() - $_SESSION["last_msg"] < $CONFIG['MSG_COOLDOWN']) ){
    //user is messaging too quickly
    $seconds = $CONFIG['MSG_COOLDOWN'] - (time() - $_SESSION["last_msg"]);
    $plural = ($seconds === 1)?"":"s";
    header("HTTP/1.0 403 wait ".$seconds." second".$plural);
    echo "wait ".$seconds." second".$plural; 
}
else if(!isset($_GET["msg"]) ){
    //msg not found
    header("HTTP/1.0 403 invalid parameters");
    echo "invalid parameters";
}
else if(!validateMsg($_GET["msg"]) ){
    //invalid msg
    header("HTTP/1.0 403 invalid msg");
    echo "invalid msg";      
}
else{
    //all good. broadcast the message
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
    //removes double spaces
    $msg = str_replace("JJ","J",$_GET["msg"]);
    //removes initial spaces
    $msg = ltrim($msg,"J");
    
    $data = array(
        'message' => $msg,
        'sender' => $_SESSION["user_id"],
        'time' => time()
    );
    $pusher->trigger($_SESSION["channel"], 'morsebroadcast', $data);
    echo "sent!";
    //update session variables
    $_SESSION["last_msg"] = time();
    $_SESSION["keying"] = false;
}

?>