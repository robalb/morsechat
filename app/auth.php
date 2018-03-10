<?php
/*
this is the authentication endpoint for the pusher api.
https://pusher.com/docs/authenticating_users

the authentication is based on a session id.
if the session variables are not found, the script creates them and authenticate the user.
otherwise the user is re-authenticated using the session data.

*/
session_start();
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
  
if(isset($_POST["channel_name"]) && isset($_POST["socket_id"])){
	//if user is not already logged
	if(!isset($_SESSION["user_id"])){
		
		//generate user id variable [last 5 digits of unix timestamp] . [5 random numbers]
		$userId = substr(time(), -5);
		for($i=0; $i<5; $i++) {
			$userId .= mt_rand(0,9);
		}
		$_SESSION["user_id"] = $userId;
	
		//generate user location variables
		$_SESSION["geoplugin_continentCode"] = "unknown";
		$_SESSION["geoplugin_countryCode"] = "XX";
		$_SESSION["geoplugin_countryName"] = "unknown";
		try{
			$received_data = unserialize(file_get_contents('http://www.geoplugin.net/php.gp?ip='.$_SERVER['REMOTE_ADDR']));
			//if received data is valid and not empty
			if(isset($received_data["geoplugin_countryCode"]) && strlen($received_data["geoplugin_countryCode"]) > 0 ){
				//uupdate location variables
				$_SESSION["geoplugin_continentCode"] = htmlSpecialChars($received_data["geoplugin_continentCode"]);
				$_SESSION["geoplugin_countryCode"] = htmlSpecialChars($received_data["geoplugin_countryCode"]);
				$_SESSION["geoplugin_countryName"] = htmlSpecialChars($received_data["geoplugin_countryName"]);
			}
		} catch (Exception $e){}
		
		//generate username [2 digit countrycode] . [last 2 digits of user id] . [random letter] //65 uppercase - 97 lowercase
		$_SESSION["username"] = $_SESSION["geoplugin_countryCode"].substr($_SESSION["user_id"],-2).chr(65 + mt_rand(0, 25));

	}
	
	//strips the numeric part from the channel name
	//channel_name format: presence-ch[number]
	$ch_string = substr($_POST["channel_name"],0,11);
	$ch_number = substr($_POST["channel_name"],11);
	//validate channel name (string and numeric parts)
	$ch_string_is_valid = ($ch_string == "presence-ch");
	$ch_number_is_valid = filter_var($ch_number, FILTER_VALIDATE_INT);
	if($ch_string_is_valid && $ch_number_is_valid && $ch_number > 0 && $ch_number < $config['MAX_CHANNELS']){
		//channel is valid, save it in a session variable
		$_SESSION["channel"] = $_POST["channel_name"];
		//authenticate the user
		$presence_data = array(
			"id" => $_SESSION["user_id"],
			"username" => $_SESSION["username"],
			"continent" => $_SESSION["geoplugin_continentCode"],
			"countryCode" => $_SESSION["geoplugin_countryCode"],
			"countryName" => $_SESSION["geoplugin_countryName"]
		);
		echo $pusher->presence_auth($_POST["channel_name"], $_POST["socket_id"], $_SESSION["user_id"],$presence_data);		
	
	}else{
		//channel name was not valid
		header("HTTP/1.0 403 invalid channel name");
		echo "invalid channel name";
	}	
}else{
	//post parameters missing
	header("HTTP/1.0 403 invalid parameters");
	echo "invalid parameters";
}
?>