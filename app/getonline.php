<?php
/**
* this script returns the number of online morsers and active channels in json format.
* example {"channels":2,"online_users":2}
* 
* shields.io badges generated from this format:
* 
* - online users
* https://img.shields.io/badge/dynamic/json.svg?label=online%20users&uri=http%3A%2F%2Fwww.halb.it%2Fmorsecode%2Fapp%2Fgetonline.php&query=%24..online_users
* - active channels
* https://img.shields.io/badge/dynamic/json.svg?label=active%20channels&uri=http%3A%2F%2Fwww.halb.it%2Fmorsecode%2Fapp%2Fgetonline.php&query=%24..channels
* 
*/

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
  
//get all channels
$result = $pusher->get_channels();
$channels = $result->channels;
//foreach channel, get its online users and add the value to $user_count
$user_count = 0;
foreach ($channels as $key=>$value) {
	$info = $pusher->get_channel_info($key, array('info' => 'user_count'));
	$user_count += $info->user_count;
}

//format data as json and return it
$json["channels"] = count($channels);
$json["online_users"] = $user_count;
echo json_encode($json);
	

?>
