<?php
		$_SESSION["continent"] = "unknown";
		$_SESSION["countryCode"] = "XX";
		$_SESSION["countryName"] = "unknown";
		try{
			$received_json = file_get_contents('http://getcitydetails.geobytes.com/GetCityDetails?fqcn='.$_SERVER['REMOTE_ADDR']);
			//$received_json = file_get_contents('http://www.geoplugin.net/php.gp?ip='.$_SERVER['REMOTE_ADDR']);
			$received_data = json_decode($received_json, true);
			//if received data is valid and not empty
			if(isset($received_data["geobytescountry"]) && strlen($received_data["geobytescountry"]) > 0 ){
				//uupdate location variables
				$_SESSION["continent"] = htmlSpecialChars($received_data["geobytesmapreference"]);
				$_SESSION["countryCode"] = htmlSpecialChars($received_data["geobytesinternet"]);
				$_SESSION["countryName"] = htmlSpecialChars($received_data["geobytescountry"]);
			}
		} catch (Exception $e){}
		
	echo $_SESSION["continent"];
	echo "<br>";
	echo $_SESSION["countryCode"];
	echo "<br>";
	echo $_SESSION["countryName"];
	echo "<br>";

?>