<!doctype html>
<html>
<head>
<title>morse chat</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1,user-scalable=no">
 <meta name="application-name" content="online morse radio"/>
<meta name="keywords" content="morse,telegraph,radio,frequency,chatroom,online,bugs" />
<meta name="description" content="an online morse radio" />
<meta name="msapplication-TileColor" content="#212121" />
<meta name="theme-color" content="#212121" />

<!-- <link href="css/style.css" rel="stylesheet" /> -->
<link href="css/icons.css" rel="stylesheet" />

<link href="https://fonts.googleapis.com/css?family=Roboto:300" rel="stylesheet">
 <!--<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet"> -->

<style>
html,body{
  background-color:#333333;
  color:#fafafa;
  font-family: 'Roboto', monospace;
  margin:0;
  overflow-x:hidden;
  height: 100%;
  -webkit-tap-highlight-color: rgba(0,0,0,0);

  background: #333333 url("css/bg.png");

}

#nav{
  width: 100%;
  height:50px;
  background-color: #212121;
  box-shadow: 0 2px 5px rgba(0,0,0,.26);
  text-align:center;
}
#nav button{
  cursor: pointer;
  border: 0;
  display: block;
  height: 50px;
  overflow: hidden;
  top: -50px;
  left:0px;
  position:relative;
  width: 50px;
  color:#efebe9;
  background-color:#212121;
  outline-style:none;
}
#nav  a{
  text-decoration: none;
  color: #efebe9;
  font-family: 'Roboto',monospace,Sans serif;
  font-size: 21px;
  height: 50px;
  line-height: 50px;
  margin: 0 .5em 0 .5em;
  width: .5em;
  cursor:pointer;
}
.block1{
  min-height:100%; 
  background-color:rgba(66, 66, 66, 0.3); 
  text-align:left;
  overflow-y:hidden;
  overflow-x:hidden;
  max-width:600px;
  margin: 0 auto;
  box-shadow: 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23);
  -webkit-box-shadow: 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23);
  -moz-box-shadow: 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23);
  font-family: 'Roboto', monospace;
  padding:10px;
}
.block1 h1,h2,h3{
	color:white;
  font-family: 'Roboto', monospace;
}
.block1 a{
	background-color:#4d4d4d;
	color:white;
	text-decoration:none;
	background: linear-gradient(0deg, #333333 50%, #404040 50%);
	border-bottom:1px solid #a6a6a6;
}
.block1 a:hover{
	background: linear-gradient(0deg, #404040 50%, #333333 50%);
	border-bottom:1px solid #666666;
}

ul {
    list-style: none;
    padding:0;
    margin:0;
    margin-bottom: 3em;
}

li { 
    line-height: 1.4;
    padding-left: 1em;
    margin-bottom: .8em;
    /*text-indent: -.5em;*/
		max-width: 700px;
}
li:before {
    content: "\21A3  ";
    color: #cccccc;
}


</style>
 
</head>
<body>
    <div id="nav">
		<a>about</a>
		<button class="hamburger" onclick="window.history.back()" ><i class="material-icons">arrow_back</i></button>
    </div>

	<div class="block1">
		<h1>morsechat</h1>
		<p>This is an open source morse chat that you can use to learn morse and comunicate with friends,
		without having to buy a radio.<br>This project is based on
		<a href="https://twitter.com/bkanber">&nbsp;@bkanber&nbsp;</a> 's web app <a href="morsecode.me">&nbsp;morsecode.me&nbsp;</a></p>
		<p>Press the key at the bottom of the page or use the spacebar to transmit. Iambic mode and keying speed can be configured in the settings section.</p>
		<p>This chat is not in real time, the messages you type are sent after a short period of inactivity, when
		the progress bar at the top of the page reaches the end.</p>
		<p>This website uses a third party websocket service that allows a real time connection between all the users. The messages you type are broadcasted without being stored on the server,
		and reloading the page or switching channel will permanently delete all the messages you received.</p>	
		<!--
		<h2>what's new</h2>
		<h3>V 1.0 <span style="color:#cccccc">[19/ 3/ 2018]</span></h3>
		<p>This is the first version of the chat. Everything is new
		</p>
		-->
		
		<h2 id="bugs">bugs</h2>
		<p>You can report bugs or give your suggestions on <a href="https://github.com/robalb/morsechat/issues">&nbsp;github&nbsp;</a> or <a href="https://twitter.com/albertCoolwind">twitter</a>
		 </p>
    <p><a href="https://discord.gg/JPzfzNJG6e">join our official discord server</a></p>
		
		<h2>todo list:</h2>
		<ul>
			<li><strike>online users list, with 'user is typing' status</strike></li>
			<li><strike>more morse key options (iambic, custom keys)</strike></li>
			<li>option to queque all the messages received from a user and play them one after the other</li>
			<li>more options for the received morse player (mute annoying messages, mute your own messages when received)</li>
			<li>better anti-spam algorithms, limit on users per room</li>
			<li>accounts with stats and skill level. Private rooms and rooms restricted to skilled morsers only</h1>
			
		</ul>
		
	</div>



</body>
</html>
