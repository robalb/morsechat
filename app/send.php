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
//validate session
if(isset($_SESSION["user_id"]) && isset($_SESSION["channel"]) ){
	//validate anti-spam cooldown
	if(!isset($_SESSION["last_msg"]) || (time() - $_SESSION["last_msg"] > $config['MSG_COOLDOWN']) ){
		//validate msg
		//TODO: remove spaces (J) at the beginnig of the msg
		if(isset($_GET["msg"]) && strlen($_GET["msg"]) > 0 && strlen($_GET["msg"]) < 400 && preg_match('/^[a-zA-Z0-9]+$/', $_GET["msg"]) ){
			//removes double spaces
			$msg = str_replace("JJ","J",$_GET["msg"]);
			//removes initial spaces
			$msg = ltrim($msg);
			$data['message'] = $msg;
			$data['sender'] = $_SESSION["user_id"];
			$data['time'] = time();
			$pusher->trigger($_SESSION["channel"], 'morsebroadcast', $data);
			$_SESSION["last_msg"] = time();
			echo "sent!";
			$_SESSION["keying"] = false;
		}else{
			header("HTTP/1.0 400 invalid string");
			echo "invalid string";
		}
	}else{
		$seconds = $config['MSG_COOLDOWN'] - (time() - $_SESSION["last_msg"]);
		//TODO: change status to 400
		header("HTTP/1.0 403 wait ".$seconds." seconds");
		echo "wait ".$seconds." seconds";
	}
}else{
	header("HTTP/1.0 401 invalid session");
	echo "invalid session";
}
 
  
  
?>