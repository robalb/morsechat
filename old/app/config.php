<?php 

return array(
	//PUSHER CREDENTIALS get them at https://pusher.com/signup
	'APP_KEY' => 'your_app_key_here',
	'APP_SECRET' => 'your_app_secret_here',
	'APP_ID' => 'your_app_id_here',
	'APP_CLUSTER' => 'your_app_cluster_here',

	//ADMIN CREDENTIALS
	//open the file makepassword.php?password=yourpassword to get a valid bcript hash
	'ADMIN_USERNAME' => 'your_username_here',
	'ADMIN_PASSWORD' => 'your_bcript_password_hash_here',
	
	//GENERAL SETTINGS
	//the max number of aviable channels
	'MAX_CHANNELS' => 7,
	//the minimum number of seconds before an user can send another message
	'MSG_COOLDOWN' => 5
);

?>

