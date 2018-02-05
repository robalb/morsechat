<?php
//use this page to generate the hash of your password to store in config.php
if(isset($_GET["password"])){

	$options = [
		"cost" => 12,
	];
	echo "<p><b>your password:</b> <br>".$_GET["password"]."</p>";
	echo "<p><b>hash:</b> <br>".password_hash($_GET["password"], PASSWORD_BCRYPT, $options)."</p>";

}else{
	echo("<p> invalid password. usage: makepassword.php?password=YOURPASSWORD </p>");
}
?>
