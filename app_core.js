	
/*	
morse code online chat, by robalb
               __          ____
   _________  / /_  ____ _/ / /_ 
  / ___/ __ \/ __ \/ __ `/ / __ \
 / /  / /_/ / /_/ / /_/ / / /_/ /
/_/   \____/_.___/\__,_/_/_.___/


*/

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
		"111000":":",
		"100001":"-",
		"011110":"\'",
		"10010":"/",
		"001100":"?",
		"101011":"!",
		"011010":"@",
		"00000000":"<<",
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

var debugging=false;
	
//default: spacebar
var keyLetter = 32;

//all the element ids used in this script
var keyId;
var letterDisplayId;
var phraseDisplayId;
var barId;
var chatId;

//list of the default morse elements multipliers. this array is used to restore default settings
var defaultMultipliers=[80,3,1,3,7,2000];
//second list of multipliers: this array can be used to store custom values and apply them
var newMultipliers=[80,3,1,3,7,2000];
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
var context,g,o;

//sound settings variables
var keySound = true;
var receivedMorseSound = true;

//important.
var oX1101o = true;


window.addEventListener('load', function(){

	//get the main dom elements
	keyId = document.getElementById('key');
	barId = document.getElementById('timebar_bar');
	letterDisplayId = document.getElementById('letterDisp');
	phraseDisplayId = document.getElementById('phraseDisp');
	chatId = document.getElementById('chat');
	
	//set the morse parameters length
	//this code fix the mozilla bug that remeber input values on page refresh
	applyMultipliers(defaultMultipliers);
	
	//initialize sound
	context = new AudioContext()


	//check if touch screen is enabled
	//var isTouchDevice = 'ontouchstart' in document.documentElement; 

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
			fired = true;
			down();
		}
	}, false);
	document.addEventListener('keyup', function(e){
		if(e.keyCode == 32 || e.which == 32 || e.key == " " || e.code == "Space"){
			fired = false;
			up();
		}
	}, false);

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
		console.log("holded dash for too long. released it")
	},dashLength*3);
	
	//add graphic effect to the key
	keyId.style.backgroundColor = "#404040";
	
	//play audio if enabled
	if(keySound){
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
	console.log("letter is now "+letter)
	//also add the dot/dash to the chat
	//TODO >> possible createDocumentFragment() optimization
	letterDisplayId.insertAdjacentText("beforeend",(holdTime>dashLength?"_":"."));
	//start the timer for the function that decode into a letter the morse in the var letter, and add it
	//to the var phrase. this timer is stopped if down() is called before its sleep time has passed
	spaceTimer=setTimeout(pushword,charactersPause);
	
	//stop audio if enabled
	if(keySound){
		o.stop(context.currentTime);
		//g.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.01)//not working
	}
	
}}

function pushword(pushSpace){
	if(pushSpace){
		//add space to the phrasebuffer
		phrase+="3";
		//add space to the phrase screen
		phraseDisplayId.insertAdjacentHTML("beforeend"," ");
		console.log("added space");
		//start the sendmessage countdown function, with graphic acceleration.
		// when it reaches 100%, the current phrase stored in the phrase buffer is sent to the server
		//to stop it, set countDownCtrl to 0; to start set countDownCtrl to the current timestamp
		countDownCtrl = Date.now();
		//this make visible the progress bar
		barId.style.height = "2px";
		sendMSgCountDown();
		console.log("started a "+phraseInactivityTime+"ms countdown")
		
	}else{
	//store raw letter in phrase buffer
	phrase+="2"+letter;
	//add translated letter to the phrase screen
	var rt=morseTree[letter]?morseTree[letter]:"<span>|</span>";
	phraseDisplayId.insertAdjacentHTML("beforeend",rt);
	console.log("decoded "+letter+" into "+rt);
	//reset the letter buffer and clear the letter screen
	letter="";
	letterDisplayId.innerText = "";
	console.log("letter added to phrase")
	console.log("phrase is now "+phrase)
	//start timer to push space
	spaceTimer=setTimeout(pushword,wordsPause,true);
	}
}



function sendMSgCountDown(){
	if(countDownCtrl==0){
		console.log("send countdown interrupted. progress bar removed")
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
			console.log("made it to "+phraseInactivityTime+"! sending the message")
			//reset and makes invisible the progress bar
			barId.style.height = "0px";
			barId.style.width = "0px";
			//TODO >> clear current phrase message, send this one etch

			//probably to remove when websocket is implemented
			chatId.insertAdjacentHTML("beforeend","<p><a href=''>robalb</a>: "+phrase+"</p>");
			phrase="";
			phraseDisplayId.innerHTML = "";
			
		}
	}
}



//UI functions

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

//SETTINGS functions

function updateMultiplier(element,newVal){
	if(element==0){
		document.getElementById("dotSpeedDisp").text=newVal;
	}
	//validate input
	if(newVal>0&&((newVal<=500)||(element==5&&newVal<=4000)) ){
		//add the new input to the second multipliers list
		newMultipliers[element]=newVal;
		console.log("applying multipliers");
		//apply the second multiplier list to the morse elements length
		applyMultipliers(newMultipliers);
	}
}
function restoreDefaultMultipliers(){
	console.log("applying default multipliers");
	applyMultipliers(defaultMultipliers);
	newMultipliers = defaultMultipliers.slice(0);
}

function applyMultipliers(applyList){
	//update variables
	dotSpeed = applyList[0];
	dashLength = dotSpeed*applyList[1];
	elementsPause = dotSpeed*applyList[2];
	charactersPause = dotSpeed*applyList[3];
	wordsPause = dotSpeed*applyList[4];
	phraseInactivityTime = applyList[5];
	//update graphic part
	document.getElementById("dotSpeedDisp").text=applyList[0];
	document.getElementById("speedRange").value=applyList[0];
	var x=document.getElementsByClassName("tElement");
	for(var i=0;i<x.length;i++){
		x[i].value = applyList[i+1];
	}
}
function dumpSettings(){
	var stringD="";
	newMultipliers.forEach(function(s){stringD+="x"+s});
	popup("export code","<p>this is your configuration code. Keep it somewhere safe.</p><p><b>"+stringD+"</i></p><br>");
}
function importSettings(){
	var rString = document.getElementById("stringInput").value;
	var sr = rString.split("x");
	//validate input string
	if(sr.length == 7){
		for(var i=1;i<7;i++){
			console.log(sr[i]);
			if(parseFloat(sr[i])>0&&parseFloat(sr[i])<=4000){
				newMultipliers[i-1]=parseFloat(sr[i]);
			}else{
				console.log("invalid value");
				newMultipliers[i-1] = defaultMultipliers[i-1];
			}
		}
		applyMultipliers(newMultipliers);
	}else{
		popup("import error","<p>Invalid code!</p>");
	}
}
function toggleKeySound(){
	if(keySound){
		keySound = false;
		document.getElementById("ksbutton").innerText = "enable key sound";
	}else{
		keySound = true;
		document.getElementById("ksbutton").innerText = "disable key sound";
	}
}
function toggleReceivedSound(){
	if(receivedMorseSound){
		receivedMorseSound = false;
		document.getElementById("rmbutton").innerText = "unmute received morse";
	}else{
		receivedMorseSound = true;
		document.getElementById("rmbutton").innerText = "mute received morse";
	}	
}



