
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

function displaySenderInfo(senderId){
	var user = channel.members.get(senderId);
	if(user){
		popup("user info",
			"<p>username: "+user.info.username+
			"<br>id: "+senderId+
			"<br>continent: "+user.info.continent+
			"<br>country: "+user.info.countryName+
			"</p>"
		);
	}else{
		popup("user info","<p>this user doesn't exist anymore</p>");
	}
}

function changeUsername(){
	if(isAuth){
		pusher.unsubscribe('presence-ch1');
		var xhr = new XMLHttpRequest();
		xhr.open('GET', '../morsecode/app/sessionremove.php');
		xhr.onload = function() {
			if (xhr.status === 200) {
				log(xhr.statusText)
				location.reload()
			}
			else {
				insertMsg("<p>failed to change your username. error: <br>" +  xhr.status + " " + xhr.statusText + "</p>");
			}
		};
		xhr.send();
	}else{
		insertMsg("<p>you are not connected to a channel</p>");
	}
}

function scrollDown(){
	document.getElementById("radiobt").style.display = "none";
	chatId.scrollTop = chatId.scrollHeight;
	if(viewTagDisplaied){
		viewedMessages = true;
	}
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
		log("applying multipliers");
		//apply the second multiplier list to the morse elements length
		applyMultipliers(newMultipliers);
	}
}
function restoreDefaultMultipliers(){
	log("applying default multipliers");
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
			log(sr[i]);
			if(parseFloat(sr[i])>0&&parseFloat(sr[i])<=4000){
				newMultipliers[i-1]=parseFloat(sr[i]);
			}else{
				log("invalid value");
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

function ch(){
	alert("there is only one channel at the moment");
}