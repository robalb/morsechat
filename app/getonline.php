<?php
/*
this script returns the number of online morsers and active channels in json format.
example {"channels":2,"online_users":2}

shield.io badges associated with this:

- online users
https://img.shields.io/badge/dynamic/json.svg?label=online%20users&uri=http%3A%2F%2Fwww.halb.it%2Fmorsecode%2Fapp%2Fgetonline.php&query=%24..online_users
- active channels
https://img.shields.io/badge/dynamic/json.svg?label=active%20channels&uri=http%3A%2F%2Fwww.halb.it%2Fmorsecode%2Fapp%2Fgetonline.php&query=%24..channels

*/

require_once('pusher/Pusher.php');
require_once('pusher/PusherException.php');
require_once('pusher/PusherInstance.php');

$config = include('config.php');


  $options = array(
	'cluster' => $config['APP_CLUSTER'],
	'encrypted' => true
  );

  $pusher = new Pusher\Pusher(
	$config['APP_KEY'],
	$config['APP_SECRET'],
	$config['APP_ID'],
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
