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
  
if(isset($_SESSION["user_id"])){
	if(isset($_GET["msg"]) && strlen($_GET["msg"]) > 0 && strlen($_GET["msg"]) < 400){
		$msg = htmlspecialchars($_GET["msg"]);
		//TODO: allow only uppercase and lowercase english alhabet letters and numbers. remove everything else
		$data['message'] = $msg;
		$data['sender'] = $_SESSION["user_id"];
		$pusher->trigger('presence-ch1', 'morsebroadcast', $data);	
	}else{
		echo "invalid string";
	}
}else{
	echo "invalid sesion";
}
 
  
  
?>