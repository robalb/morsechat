<?php
/*
this script receives an ajax call from the connected users when they send a message.
received data: msg (get)
if the session is valid, the message is broadcasted.

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
  
if(isset($_SESSION["user_id"]) && isset($_SESSION["channel"]) ){
	//validate msg
	if(isset($_GET["msg"]) && strlen($_GET["msg"]) > 0 && strlen($_GET["msg"]) < 400 && ctype_alnum($_GET["msg"]) ){
		$msg = htmlspecialchars($_GET["msg"]);
		$data['message'] = $msg;
		$data['sender'] = $_SESSION["user_id"];
		$data['time'] = time();
		$pusher->trigger($_SESSION["channel"], 'morsebroadcast', $data);
		echo "sent!";
	}else{
		echo "invalid string";
	}
}else{
	echo "invalid sesion";
}
 
  
  
?>