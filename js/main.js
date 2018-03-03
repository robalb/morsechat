
/* ------------- CONFIG --------------*/

//enable console logs
var debugging=true;

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
	"000000":"cancel",
	"01111":"1",
	"00111":"2",
	"00011":"3",
	"00001":"4",
	"00000":"5",
	"10000":"6",
	"11000":"7",
	"11100":"8",
	"11110":"9",
	"11111":"0"
}

//all the element ids used in this script
var keyId;
var letterDisplayId;
var phraseDisplayId;
var barId;
var chatId;

//list of the default morse elements multipliers. this array is used to restore default settings
var defaultMultipliers=[80,3,1,3,5,2000];
//second list of multipliers: this array can be used to store custom values and apply them
var newMultipliers=[80,3,1,3,5,2000];
//customizable morse parameters. their values are set on page load, or from the page settings
//by applying the arrays above
var dotSpeed;
var dashLength;
var elementsPause;
var charactersPause;
var wordsPause;
var phraseInactivityTime;

//time counter variable used to recognize dot, dashes and spaces
var startHold = 0;
var stopHold = 0;
var holdTime = 0;

//current letter and current phrase typed
var letter="";
var phrase="";

//var to prevent keydown triggering multiple times when a key is hold for too long
var fired = false;

//timer that calls up() if the key has been down for too long
var dashTimer;
//state of the key
var isDown=false;

//timer that calls the function pushword() after a given time of inactivity.
//this function decode the morse stored in var letter into a string and push it to var phrase
var spaceTimer;

//variable to control(start/stop) the sendMsg recursive function
var countDownCtrl;

//audio variables
var audioSupport=true;
var g;
var o;

//sound settings variables
var keySound = true;
var receivedMorseSound = true;

//pusher session variables
var isAuth = false;

//important.
var oX1101o = true;

//chat scroll
var viewTagDisplaied = false;
var viewedMessages = false;

//variables to avoid spam caused by users joining and quitting
//type: normal 0, user joined 1, user quitted 2, system msg 3
var lastMessageType;
//the id of the last person that joined/left the chat
var lastPersonId;


window.addEventListener('load', function(){
	
	//enable-disable debugging
	Pusher.logToConsole = debugging;

	//get the main dom elements
	keyId = document.getElementById('key');
	barId = document.getElementById('timebar_bar');
	letterDisplayId = document.getElementById('letterDisp');
	phraseDisplayId = document.getElementById('phraseDisp');
	chatId = document.getElementById('chat');
	
	//set the morse parameters length
	//this code fix the mozilla bug that remeber input values on page refresh
	applyMultipliers(defaultMultipliers);
	
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
		down();
	}, false);
	keyId.addEventListener('touchend',function(e){
		e.stopPropagation();
		e.preventDefault();
		up();
	}, false);
	//mouse
	keyId.addEventListener('mousedown',down, false);	
	keyId.addEventListener('mouseup',up, false);
	//keyboard
	document.addEventListener('keydown', function(e){
		if( !fired && (e.keyCode == 32 || e.which == 32 || e.key == " " || e.code == "Space")){
			//prevent spacebar from scrollin the chat
			 e.preventDefault();
			fired = true;
			down();
		}
	}, false);
	document.addEventListener('keyup', function(e){
		if(e.keyCode == 32 || e.which == 32 || e.key == " " || e.code == "Space"){
			//prevent spacebar from scrollin the chat
			 e.preventDefault();
			fired = false;
			up();
		}
	}, false);
	
	
	//pusher api
	pusher = new Pusher(config.PUSHER_KEY, {
	authEndpoint: 'app/auth.php',
	cluster: config.PUSHER_CLUSTER,
    encrypted: true
	});
	//TODO: gui for changing channel
	channel = pusher.subscribe('presence-ch1');
	
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
		insertMsg(
			"<p class='msg-normal'><a onclick='displaySenderInfo("+data.sender+")'>"+
			(data.sender == channel.members.me.id?"you":msgsender.info.username)+
			"</a>: "+
			webDecode(data.message)+
			"</p>"
			);
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
			insertMsg(
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
			insertMsg(
			"<p class='msg-normal' ><a onclick='displaySenderInfo("+member.id+")' >"+member.info.username+"</a>"+
			"<span class='editable'> left the chat. <br>"+
			onlineMorsers+" morser"+(onlineMorsers>1?"s":"")+" online</span></p>"
			);
			log("removed member")
			log(member)			
		}

	});



}, false);


//called when a key, or a button, or a touch key is pressed
function down(){
	if(!isDown){isDown=true;
		
	//stop the timer that would otherwise call the function pushword() if inactive for too much
	clearTimeout(spaceTimer);
	//stop the countdown recursive function timer that send the typed phrase to the server
	//if inactive for too much
	countDownCtrl=0;
	//memorize the current timestamp. used to recognize dot/dash length
	startHold = Date.now();
	//infinite-length dash prevention timer
	dashTimer=setTimeout(function(){
		up();
		isDown = false;
		log("holded dash for too long. released it")
	},dashLength*3);
	
	//add graphic effect to the key
	keyId.style.backgroundColor = "#404040";
	
	//play audio if enabled
	if(audioSupport && keySound){
		o = context.createOscillator()
		o.frequency.value = 1175
		g = context.createGain()
		o.connect(g)
		g.connect(context.destination) 
		o.start(0)
		}
		
}}

//called when a key, or a button, or a touch key is released
//except for when one of these inputs has been down for too much, and up() has already
//been called by dashTimer
function up(){
	if(isDown){isDown=false;
	
	clearTimeout(dashTimer);
	
	//remove graphic effect from the key
	keyId.style.backgroundColor = "#212121";
	//calculate the hold time
	stopHold = Date.now();
	holdTime = stopHold - startHold;
	//determine from holdTime if it is dash or dot and add it to the letter buffer
	letter+=""+(holdTime>dashLength?"1":"0");
	log("letter is now "+letter)
	//also add the dot/dash to the chat
	letterDisplayId.insertAdjacentText("beforeend",(holdTime>dashLength?"_":"."));
	//start the timer for the function that decode into a letter the morse in the var letter, and add it
	//to the var phrase. this timer is stopped if down() is called before its sleep time has passed
	spaceTimer=setTimeout(pushword,charactersPause);
	
	//stop audio if enabled
	if(audioSupport && keySound){
		o.stop(context.currentTime);
		//g.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.01)//not working
	}
	
}}

function pushword(pushSpace){
	if(pushSpace){
		//add space to the phrasebuffer
		phrase+="J";
		//add space to the phrase screen
		phraseDisplayId.insertAdjacentHTML("beforeend"," ");
		log("added space");
		//start the sendmessage countdown function, with graphic acceleration.
		// when it reaches 100%, the current phrase stored in the phrase buffer is sent to the server
		//to stop it, set countDownCtrl to 0; to start set countDownCtrl to the current timestamp
		countDownCtrl = Date.now();
		//this make visible the progress bar
		barId.style.height = "2px";
		sendMSgCountDown();
		log("started a "+phraseInactivityTime+"ms countdown")
		
	}else if(letter == "000000"){
		letter="";
		letterDisplayId.innerText = "";
		//remove last letter from phrase
		phrase = webDecode(phrase).substring(0, phrase.length -1);
		//update phrase display
		phraseDisplayId.innerText = phrase;
		log("undo")
		log("phrase is now "+phrase)
		if(phrase.length > 0){
			spaceTimer=setTimeout(pushword,wordsPause,true);
		}else{
			insertMsg("<p>message removed</p>");			
		}
	}else{
		//store letter in phrase buffer. spaces are stored as uppercase J and special chars are encoded in other
		//uppercase letters by function webEncode. non existing letters [[are stored as upercase K]] are not stored
		phrase+= ""+(morseTree[letter]?webEncodeLetter(morseTree[letter]):"");
		//add translated letter to the phrase screen
		var rt=morseTree[letter]?morseTree[letter]:"<span>|</span>";
		phraseDisplayId.insertAdjacentHTML("beforeend",rt);
		log("decoded "+letter+" into "+rt);
		//reset the letter buffer and clear the letter screen
		letter="";
		letterDisplayId.innerText = "";
		log("letter added to phrase")
		log("phrase is now "+phrase)
		//start timer to push space
		spaceTimer=setTimeout(pushword,wordsPause,true);
	}
}



function sendMSgCountDown(){
	if(countDownCtrl==0){
		log("send countdown interrupted. progress bar removed")
		//reset and makes invisible the progress bar
		barId.style.height = "0px";
		barId.style.width = "0px";
	}else{
		//get the milliseconds passed since the function started
		var progress = Date.now() - countDownCtrl;
		if(progress<phraseInactivityTime){
			//set the bar width according to the loadin percentage
			barId.style.width = (progress*100/phraseInactivityTime) + "%";
			//graphic acceleration stuff
			window.requestAnimationFrame(sendMSgCountDown);
		}else{
			log("made it to "+phraseInactivityTime+"! sending the message")
			//reset and makes invisible the progress bar
			barId.style.height = "0px";
			barId.style.width = "0px";
			//TODO >> clear current phrase message, send this one etch
			//TODO >> possible createDocumentFragment() optimization
			
			//chatId.insertAdjacentHTML("beforeend","<p>sending..</p>");
			if(isAuth){
				var xhr = new XMLHttpRequest();
				xhr.open('GET', 'app/send.php?msg='+phrase );
				xhr.onload = function() {
					if (xhr.status === 200) {
						log(xhr.statusText)
					}
					else {
						insertMsg("<p>error" +  xhr.status + " " + xhr.statusText + "</p>");
					}
				};
			xhr.send();
			}else{
				insertMsg("<p>failed to broadcast the message. <br> you are not connected to a channell</p>");
			}		
			phrase="";
			phraseDisplayId.innerHTML = "";			
		}
	}
}

function insertMsg(msgBody,systemMessage){
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
		if(audioSupport && keySound){
		var o = context.createOscillator()
		o.frequency.value = 440
		var g = context.createGain()
		o.connect(g)
		g.connect(context.destination) 
		o.start(0)
		setTimeout(function(){o.stop()}, 100);
		}

}


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


function webEncodeLetter(letter){
	var ret = letter;
	for (var key in specialChars) {
		if (specialChars.hasOwnProperty(key)){
			if(specialChars[key] == letter){
				ret = key;
			}
		}
	}
	return ret;
}


function webDecode(string){
	var dString = string;
	for (var key in specialChars) {
		dString = dString.replace(key,specialChars[key]);
		dString = dString.replace(new RegExp(key, 'g'),specialChars[key]);
	}
	return dString.toLowerCase();
}

function log(msg){
	if(debugging){
		console.log(msg);
	}
}
