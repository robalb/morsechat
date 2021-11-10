<?php
/**
* this is the authentication endpoint for the pusher api.
* https://pusher.com/docs/authenticating_users
* 
* the authentication is based on a session id.
* if the session is not found, the script creates it and authenticate the user.
* otherwise the user is re-authenticated using the existing data.
* 
*/
session_start();
require_once('pusher/Pusher.php');
require_once('pusher/PusherException.php');
require_once('pusher/PusherInstance.php');

//add custom analytics and notifications
$NOTIFICATIONS_ENABLED = false;
if(file_exists('notifications.php')){
    include('notifications.php');
    $NOTIFICATIONS_ENABLED = true;
}

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
* this function generates all the user session variables
* 'user_id'       (string) the user identifier
* 'keying'        (boolean) the user keying status
* 'continentCode' (string) the user's ip continent code
* 'countryCode'   (string) the user's ip country code
* 'countryName'   (string) the user's ip country name
* 'username'      (string) username generated using countrycode, timestamp and random letters
*/
function createSession(){
    $userId = substr(time(), -5);
    for($i=0; $i<5; $i++) {
     $userId .= mt_rand(0,9);
    }
    //user id session variable [last 5 digits of unix timestamp] . [5 random numbers]
    $_SESSION["user_id"] = $userId;
    //user is keying session varaible
    $_SESSION["keying"] = false;
    //user geolocation session variables
    $_SESSION["continentCode"] = "unknown";
    $_SESSION["countryCode"] = "XX";
    $_SESSION["countryName"] = "unknown";
    //try to get geolocation data from user ip
    /* Time flies, and apis die
    try{
        $received_json = file_get_contents('http://getcitydetails.geobytes.com/GetCityDetails?fqcn='.$_SERVER['REMOTE_ADDR']);
        $received_data = json_decode($received_json, true);
        //if received data is valid and not empty, update geolocation session variables
        if(isset($received_data["geobytescountry"]) && strlen($received_data["geobytescountry"]) > 0 ){
            $_SESSION["continentCode"] = htmlSpecialChars($received_data["geobytesmapreference"]);
            $_SESSION["countryCode"] = htmlSpecialChars($received_data["geobytesinternet"]);
            $_SESSION["countryName"] = htmlSpecialChars($received_data["geobytescountry"]);
        }
    } catch (Exception $e){}
    */
    //username session variable [2 digit countrycode] . [last 2 digits of user id] . [random letter] //65 uppercase - 97 lowercase
    $_SESSION["username"] = $_SESSION["countryCode"].substr($_SESSION["user_id"],-2).chr(65 + mt_rand(0, 25));

}

/**
* this function checks that the channel name provided
* corresponds to the pattern 'presence-ch'.[integer]
* 
* @params string $ch_name - the ch name to validate
* @params integer $max_channels - the max amount of channels aviable
*
* @return boolean
*/
function validateChName($ch_name, $max_channels){
   //strips the numeric part from the channel name
   //channel_name format: presence-ch[number]
   $ch_string = substr($ch_name,0,11);
   $ch_number = substr($ch_name,11);
   //validate channel name (string and numeric parts)
   $ch_string_is_valid = ($ch_string === "presence-ch");
   $ch_number_is_valid = filter_var($ch_number, FILTER_VALIDATE_INT);
   
   return ($ch_string_is_valid && $ch_number_is_valid && $ch_number > 0 && $ch_number <= $max_channels);  
}


  
if(!isset($_POST["channel_name"]) || !isset($_POST["socket_id"]) ){
   //post parameters missing
   header("HTTP/1.0 403 invalid parameters");
   echo "invalid parameters";
   
}
else if(!validateChName($_POST["channel_name"], $CONFIG['MAX_CHANNELS']) ){
    //ch name is not valid
    header("HTTP/1.0 403 invalid channel name");
    echo "invalid channel name";
}
else{
    //all good. authenticate the user
    
    //if user doesn't have a session, create it
    $already_logged = true;
    if(!isset($_SESSION["user_id"])){
        $already_logged = false;
        createSession();
    }
    //user's channel session variable
    $_SESSION["channel"] = $_POST["channel_name"];
    
    //authenticate the user
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
    $presence_data = array(
         "id" => $_SESSION["user_id"],
         "username" => $_SESSION["username"],
         "continent" => $_SESSION["continentCode"],
         "countryCode" => $_SESSION["countryCode"],
         "countryName" => $_SESSION["countryName"]
    );
    echo $pusher->presence_auth($_POST["channel_name"], $_POST["socket_id"], $_SESSION["user_id"],$presence_data);
    
    //notifications coming soon
    if($NOTIFICATIONS_ENABLED){
        $ch_number = substr($_POST["channel_name"],11);
        pushNotification('joined',$_SESSION["countryName"],$ch_number,$already_logged);
    }

}

?>
