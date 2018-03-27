<?php
/*
this script receives an ajax call from the connected users when they start typing, or when
they stop typing and undo the transmission of the message.
received data: status (get)
if the session is valid, the 'startedkeying'(user started typing) or 'stoppedkeying'(user stopped typing) event is broadcasted


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
if(isset($_SESSION["user_id"]) && isset($_SESSION["channel"])){

		//create sesson variable if it doesn't exist
		//TODO: remove when all old sessions have expired
		if(!isset($_SESSION["keying"])){
			$_SESSION["keying"] = false;
		}
		
		//validate parameter
		if(isset($_GET["status"])){
			//user has started keying
			if($_GET["status"]=="true" && $_SESSION["keying"] == false){
				$_SESSION["keying"] = true;
				echo "start broadcasted";
				//broadcast the event
				$data['sender'] = $_SESSION["user_id"];
				$data['time'] = time();
				$pusher->trigger($_SESSION["channel"], 'startedkeying', $data);
			}
			//user has stopped keying
			else if($_GET["status"]=="false" && $_SESSION["keying"] == true){
				//to avoid broadcasting a ton of status updates with users that stop and abort
				//typing immediately after starting, the 'stopped typing' method can be called
				//only after a cooldown. the other way to trigger a 'stopped typing' is by sending a message, but that's already
				//controlled by a cooldown
				if(!isset($_SESSION["last_update"]) || (time() - $_SESSION["last_update"] > $config['MSG_COOLDOWN']) ){
					$_SESSION["keying"] = false;
					$_SESSION["last_update"] = time();
					echo "stop broadcasted";
					//broadcast the event
					$data['sender'] = $_SESSION["user_id"];
					$data['time'] = time();
					$pusher->trigger($_SESSION["channel"], 'stoppedkeying', $data);
					
				}else{
					header("HTTP/1.0 403 wait X seconds");
					echo "wait X seconds";
				}		
			}
		}else{
			header("HTTP/1.0 400 invalid parameter");
			echo "invalid parameter";		
		}
}else{
	header("HTTP/1.0 400 invalid session");
	echo "invalid session";
}
 
  
  
  
 
?>