<?php
session_start();

require_once('pusher/Pusher.php');
require_once('pusher/PusherException.php');
require_once('pusher/PusherInstance.php');


  $options = array(
    'cluster' => 'eu',
    'encrypted' => true
  );
  $pusher = new Pusher\Pusher(
   'APP_KEY',
    'APP_SECRET',
    'APP_ID',
    $options
  );
  
if(isset($_POST["channel_name"]) && isset($_POST["socket_id"])){
	if(!isset($_SESSION["user_id"])){
		$_SESSION["user_id"] = time();
	}
	
	$ip_data["geoplugin_continentCode"] = "unknown";
	$ip_data["geoplugin_countryCode"] = "XX";
	$ip_data["geoplugin_countryName"] = "unknown";
	try{
		$ip_data = unserialize(file_get_contents('http://www.geoplugin.net/php.gp?ip='.$_SERVER['REMOTE_ADDR']));
	} catch (Exception $e) {
	}
	// [2 digit countrycode] . [last 3 digits of unix timestamp id] . [last ip digit]
	$username = $ip_data["geoplugin_countryCode"].substr($_SESSION["user_id"], -3).substr($_SERVER['REMOTE_ADDR'], -1);
	
 $presence_data = array(
 "id" => $_SESSION["user_id"],
 "username" => $username,
 "continent" => $ip_data["geoplugin_continentCode"],
 "countryCode" => $ip_data["geoplugin_countryCode"],
 "countryName" => $ip_data["geoplugin_countryName"]
 );


	echo $pusher->presence_auth($_POST["channel_name"], $_POST["socket_id"], $_SESSION["user_id"],$presence_data);

}else{
	header('', true, 403);
}
?>