	
	
/* ------------- CONFIG --------------*/

//enable console logs
var debugging = true;

/* ----------------------------------*/


var morseTree = {
	"01":"a",
	"1000":"b",
	"1010":"c",
	"100":"d",
	"0":"e",
	"0010":"f",
	"110":"g",
	"0000":"h",
	"00":"i",
	"0111":"j",
	"101":"k",
	"0100":"l",
	"11":"m",
	"10":"n",
	"111":"o",
	"0110":"p",
	"1101":"q",
	"010":"r",
	"000":"s",
	"1":"t",
	"001":"u",
	"0001":"v",
	"011":"w",
	"1001":"x",
	"1011":"y",
	"1100":"z",
	"010101":".",
	"110011":",",
	"001100":"?",
	"011110":"\'",
	"101011":"!",
	"10010":"/",
	"111000":":",
	"101010":";",
	"10001":"=",
	"100001":"-",
	"01010":"+",
	"011010":"@",
	//"000000":"cancel",
	"01111":"1",
	"00111":"2",
	"00011":"3",
	"00001":"4",
	"00000":"5",
	"10000":"6",
	"11000":"7",
	"11100":"8",
	"11110":"9",
	"11111":"0",
	"00000010":" "
}

//global audio variables
var audioSupport=true;
var context;

//pusher session variables
var isAuth = false;

//important.
var oX1101o = true;


window.addEventListener('load', function(){
	
	//enable-disable debugging
	Pusher.logToConsole = debugging;

	//get the main dom elements used in this script
	keyId = document.getElementById('key');
	barId = document.getElementById('timebar_bar');
	letterDisplayId = document.getElementById('letterDisp');
	phraseDisplayId = document.getElementById('phraseDisp');
	chatId = document.getElementById('chat');
	fragment = document.createDocumentFragment();
	
	//set the morse parameters length
	settings.applyMultipliers(settings.defaultMultipliers);
	
	//create audio context
	if (typeof AudioContext !== "undefined") {
		context = new AudioContext();
    } else if (typeof webkitAudioContext !== "undefined") {
		context = new webkitAudioContext();
    } else if (typeof window.webkitAudioContext !== "undefined") {
		context = new window.webkitAudioContext();
    } else if (typeof window.AudioContext !== "undefined") {
		context = new window.AudioContext();
    } else if (typeof mozAudioContext !== "undefined") {
		context = new mozAudioContext();
    } else{
		audioSupport = false;
	}
	
	//remove the scroll-down radio button if user scroll down to the bottom of the chat.
	 chatId.addEventListener('scroll',function(e){
		if(viewTagDisplaied){
			if(!(chatId.scrollTop < (chatId.scrollHeight - chatId.offsetHeight))){
				document.getElementById("radiobt").style.display = "none";
				viewedMessages = true;				
			}
		}
	}, false);
	
	//touch
	keyId.addEventListener('touchstart',function(e){
		e.stopPropagation();
		e.preventDefault();
		morseKey.down();
	}, false);
	keyId.addEventListener('touchend',function(e){
		e.stopPropagation();
		e.preventDefault();
		morseKey.up();
	}, false);
	//mouse
	keyId.addEventListener('mousedown',function(){console.log(morseKey);morseKey.down()}, false);	
	keyId.addEventListener('mouseup',function(){morseKey.up()}, false);
	//keyboard
	//var to prevent keydown triggering multiple times when a key is hold for too long
	var fired = false;
	document.addEventListener('keydown', function(e){
		if( !fired && (e.keyCode == 32 || e.which == 32 || e.key == " " || e.code == "Space")){
			//prevent spacebar from scrollin the chat
			 e.preventDefault();
			fired = true;
			morseKey.down();
		}
	}, false);
	document.addEventListener('keyup', function(e){
		if(e.keyCode == 32 || e.which == 32 || e.key == " " || e.code == "Space"){
			//prevent spacebar from scrollin the chat
			 e.preventDefault();
			fired = false;
			morseKey.up();
		}
	}, false);
	
	
	//pusher api
	pusher = new Pusher(config.PUSHER_KEY, {
	authEndpoint: 'app/auth.php',
	cluster: config.PUSHER_CLUSTER,
    encrypted: true
	});
	//TODO: gui for changing channel
	channel = pusher.subscribe('presence-ch1')
	;
	//variables to avoid spam caused by users joining and quitting
	//type: normal 0, user joined 1, user quitted 2, system msg 3
	var lastMessageType;
	//the id of the last person that joined/left the chat
	var lastPersonId;
	
	channel.bind('pusher:subscription_succeeded', function() {
		isAuth = true;
		var onlineMorsers = channel.members.count;
		var channelNumber = channel.name.substr(11);
		document.getElementById("connecting-msg").innerHTML =
			"connected to channel "+channelNumber+"<br>"+
			"username: <a onclick='displaySenderInfo("+channel.members.me.id+")'>"+channel.members.me.info.username+"</a><br>"+
			onlineMorsers+" morser"+(onlineMorsers>1?"s":"")+" online";
			
		document.getElementById("sidebar_username_disp").innerText = channel.members.me.info.username;
		log(channel.members)
	});
	channel.bind('pusher:subscription_error', function(status) {
		document.getElementById("connecting-msg").innerHTML = "<p>connection error. status: "+status+"</p>";
	});

    channel.bind('morsebroadcast', function(data) {
		lastMessageType = 0;//normal message
		var msgsender = channel.members.get(data.sender);
		var nameToDisplay = data.sender == channel.members.me.id?"you":msgsender.info.username;
		/*chat.insertMsg(
			"<p class='msg-normal'><a onclick='displaySenderInfo("+data.sender+")'>"+
			(data.sender == channel.members.me.id?"you":msgsender.info.username)+
			"</a>: "+
			webDecode(data.message)+
			"</p>"
			);*/
			chat.insertMorsingMsg(data.sender,nameToDisplay,data.message);
    });
	
	channel.bind('pusher:member_added', function(member){
		var onlineMorsers = channel.members.count;
		//if the user joining previously leaved the same room and the message telling it is the last received
		if(lastMessageType != 0 && lastPersonId == member.id){
			log("still him")
			document.querySelectorAll(".msg-normal:last-child .editable")[0].innerHTML = 
				"<span class='editable'> reconnected. <br>"+
				onlineMorsers+" morser"+(onlineMorsers>1?"s":"")+" online</span></p>";
		}else{
			//normal case
			lastMessageType = 1;//member added message
			lastPersonId = member.id;
			chat.insertMsg(
			"<p class='msg-normal' ><a onclick='displaySenderInfo("+member.id+")'>"+member.info.username+"</a>"+
			"<span class='editable'> joined the chat.<br>"+
			onlineMorsers+" morsers online</span></p>"
			);
			log("new member")
			log(member)			
		}

	});
	
	channel.bind('pusher:member_removed', function(member) {
		var onlineMorsers = channel.members.count;
		//if the message telling the user joined is the last received
		if(lastMessageType != 0 && lastPersonId == member.id){
			log("still him")
			document.querySelectorAll(".msg-normal:last-child .editable")[0].innerHTML = 
				"<span class='editable'> joined and left the chat <br>"+
				onlineMorsers+" morser"+(onlineMorsers>1?"s":"")+" online</span></p>";
		}else{
			//normal case
			lastMessageType = 2;//member added message
			lastPersonId = member.id;
			chat.insertMsg(
			"<p class='msg-normal' ><a onclick='displaySenderInfo("+member.id+")' >"+member.info.username+"</a>"+
			"<span class='editable'> left the chat. <br>"+
			onlineMorsers+" morser"+(onlineMorsers>1?"s":"")+" online</span></p>"
			);
			log("removed member")
			log(member)
		}

	});



}, false);


/*
//chat scroll
//TODO: move to chat obj
var viewTagDisplaied = false;
var viewedMessages = false;


//TODO: move as property of msg obj
function insertMsg(msgBody,morseIt){
	//check if user is at the bottom of the chat. if its not (probably reading an old msg) the function
	//don't scroll down automatically and displays the #radiobt instead
	var dontScrollDown = (chatId.scrollTop < (chatId.scrollHeight - chatId.offsetHeight));

	if(dontScrollDown){
		//display scroll down radio bt
		document.getElementById("radiobt").style.display = "block";

		//remove old existing tag if messages have already been read
		if(viewTagDisplaied && viewedMessages){
			viewedMessages = false;
			viewTagDisplaied = false;
			var unreadMsgId = document.getElementById("unread-msg");
			unreadMsgId.outerHTML = "";
			delete unreadMsgId;
		}					
		//add unread messages tag if it doesn't exist
		if(!viewTagDisplaied){
			viewTagDisplaied = true;
			chatId.insertAdjacentHTML("beforeend","<p style='color:grey' id='unread-msg'>unread messages</p>");
		}
		chatId.insertAdjacentHTML("beforeend",msgBody);
	}else{
		chatId.insertAdjacentHTML("beforeend",msgBody);
		chatId.scrollTop = chatId.scrollHeight;
	}
	
	//play sound
	//TODO >> replace this beep with real morse sound of the message and play it while displaying the text
		if(audioSupport && settings.keySound){
		var o = context.createOscillator()
		o.frequency.value = 440
		var g = context.createGain()
		o.connect(g)
		g.connect(context.destination) 
		o.start(0)
		g.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1)
		o.stop(context.currentTime+0.2)
		}

}


*/

//TODO: CLEAN THIS SHIT
var specialChars = {
		"A":".",
		"B":",",
		"C":"?",
		"D":"\'",
		"E":"!",
		"F":"/",
		"G":":",
		"H":";",
		"I":"=",
		"L":"-",
		"M":"+",
		"N":"@",
		
		"J":" ",
		"K":"|"

}

function escapeRegExp(text){
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
function webEncode(string){
	var dString = string;
	for (var key in specialChars) {
			var rg = new RegExp(escapeRegExp(specialChars[key]), 'g')
				dString = dString.replace(rg,key);
	}
	log("converted phrase to "+dString)
	return dString;
}

function webDecode(string){
	var dString = string;
	for (var key in specialChars) {
		dString = dString.replace(new RegExp(key, 'g'),specialChars[key]);
	}
	return dString.toLowerCase();
}


function translateLetterToMorse(value){
	for(var key in morseTree){
		if(morseTree[key] == value) return key.split("");
	}
  return null;
}

function log(msg){
	if(debugging){
		console.log(msg);
	}
}





//####################################
//procedural UI and general functions
//####################################

function openMlSidebar(){
    document.getElementById("morseListSideBar").style.display = "block";
}
function closeMlSidebar(){
    document.getElementById("morseListSideBar").style.display = "none";
}
function stretchMlSidebar(){
	document.getElementById("morseListSideBar").style.width = "100%";
	document.getElementById("morseList").style.columnCount = 4;
}
function unstretchMlSidebar(){
	document.getElementById("morseListSideBar").style.width = "180px";
	document.getElementById("morseList").style.columnCount = 2;
}
function openMenu(){
	document.getElementById("menu").style.display = "block";
}
function openSettings(){
	document.getElementById("settings").style.display = "block";	
}
function popup(title,msgBody){
	document.getElementById("popup").style.display = "table";
	document.getElementById("popupTitle").innerText = title;
	document.getElementById("popupContent").innerHTML = msgBody;
}

function displaySenderInfo(senderId){
	var user = channel.members.get(senderId);
	if(user){
		popup("user info",
			"<p>username: "+user.info.username+
			"<br>continent: "+user.info.continent+
			"<br>country: "+user.info.countryName+
			"<br>id: "+senderId+
			"</p>"
		);
	}else{
		popup("user info","<p>this user doesn't exist anymore</p>");
	}
}

//when scrolldown the radio bt is clicked
function scrollDown(){
	document.getElementById("radiobt").style.display = "none";
	chatId.scrollTop = chatId.scrollHeight;
	if(viewTagDisplaied){
		viewedMessages = true;
	}
}
//when the channel menu in the center of the nav bar is clicked
function ch(){
	alert("there is only one channel at the moment");
}
