<?php

require_once('pusher/Pusher.php');
require_once('pusher/PusherException.php');
require_once('pusher/PusherInstance.php');




 $options = array(
    'cluster' => 'eu',
    'encrypted' => true
  );
  //$pusher = new Pusher\Pusher("APP_KEY", "APP_SECRET", "APP_ID",$options);
  $pusher = new Pusher\Pusher(
    'APP_KEY',
    'APP_SECRET',
    'APP_ID',
    $options
  );
  

if(isset($_GET["msg"])){
	if(strlen($_GET["msg"]) > 0 && strlen($_GET["msg"]) < 400){
		$msg = htmlspecialchars($_GET["msg"]);
		//TODO: allow only uppercase and lowercase alhabet and numbers. remove everything else
		$data['message'] = $msg;
		$pusher->trigger('my-channel', 'my-event', $data);
		
		
	}else{
		echo "invalid string";
	}
	  
	  
  }
 
  
  
?>