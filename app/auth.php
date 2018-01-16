<?php

require_once('pusher/Pusher.php');
require_once('pusher/PusherException.php');
require_once('pusher/PusherInstance.php');

//$pusher = new Pusher\Pusher("APP_KEY", "APP_SECRET", "APP_ID", array('cluster' => 'APP_CLUSTER'));
 
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

//TODO: use this page as session based auth beacon for pusher presence channels
  
?>