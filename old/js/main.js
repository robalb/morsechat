	
	

//global audio variables
var audioSupport=true;
var context;
//user authentication variables
var isAuth = false;
var connectedChannel = '';
//important.
var oX1101o = true;

window.addEventListener('load', function(){
	
	//enable-disable debugging
	Pusher.logToConsole = true;

	//get the main dom elements used in this script
	keyId = document.getElementById('key');
	barId = document.getElementById('timebar_bar');
	letterDisplayId = document.getElementById('letterDisp');
	phraseDisplayId = document.getElementById('phraseDisp');
	chatId = document.getElementById('chatContainer');
	chMenuId = document.getElementById('ch-menu');
	
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
		if(chat.viewTagDisplaied){
			if(!(chatId.scrollTop < (chatId.scrollHeight - chatId.offsetHeight))){
				document.getElementById("radiobt").style.display = "none";
				chat.viewedMessages = true;				
			}
		}
	}, false);
	
	//generate the switch-channel dropdown menu
	var outHtml = "";
	for(var i=1,max=config.MAX_CHANNELS+1;i<max;i++){
		outHtml += '<a onclick="chConnect('+i+')" >channel '+i+'</a>';
	}
	chMenuId.innerHTML = outHtml;
	//when the switch-channel menu in the center of the nav bar is clicked
	document.getElementById('ch-open').addEventListener('click', function(e){
		chMenuId.style.display = 'block';
		e.stopPropagation();
	});
	//close the switch-channel dropdown menu if the user clicks somewhere else
	window.addEventListener('click', function(e){
		//TODO: optimize to avoid updating the style if already invisible
		if (!chMenuId.contains(e.target)){
			chMenuId.style.display ='none';
		}
	});
	
	//prevent right click on key to open the browser right click options
	keyId.addEventListener('contextmenu',function(e){
		e.preventDefault();
	});
	
	
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
	keyId.addEventListener('mousedown',function(e){
		//straight mode
		if(settings.keyMode == 0){
			morseKey.down();
		}//iambic mode
		else{
			iambicKeyer.down(e.which);
		}
	}, false);	
	keyId.addEventListener('mouseup',function(e){
		//straight mode
		if(settings.keyMode == 0){
			morseKey.up();
		}//iambic mode
		else{
			iambicKeyer.up(e.which);
		}
	}, false);
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
    encrypted: true,
    disableStats: true
	});
	//default channel
	
	//get the ch url parameter
	var name = 'ch';
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    var chToConnect = results === null ? 1 : decodeURIComponent(results[1].replace(/\+/g, ' '));
	
	chConnect(chToConnect);
	
	/**
	 * Provides requestAnimationFrame in a cross browser way.
	 * author paulirish / http://paulirish.com/
	 */
	if(!window.requestAnimationFrame){
		window.requestAnimationFrame = ( function(){
			return window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
			function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
				window.setTimeout( callback, 1000 / 60 );
			};
		})();
	}


}, false);


//####################################
//estabilish the connection to a channel
//####################################
//TODO: move to object channels
	//variables to avoid spam caused by users joining and quitting
	//type: normal 0, user joined 1, user quitted 2, system msg 3
	var lastMessageType;
	//the id of the last person that joined/left the chat
	var lastPersonId;
function chConnect(ch){
	document.getElementById('ch-menu').style.display ='none';
	var newChannel = 'presence-ch'+ch;

		if(newChannel == connectedChannel){
			chat.insertMsg("already connected to this channel",false)
		}else{
			var stateObj = { foo: "" };
			history.replaceState(stateObj, 'morse chat', '?ch='+ch);
			document.getElementById('ch-display').innerText = ch;
			chatId.innerHTML = '<p id="connecting-msg">connecting...</p>';
			isAuth = false;
			pusher.unsubscribe(connectedChannel);
			channel = pusher.subscribe(newChannel);
			connectedChannel = newChannel;
			//pusher stuff
			//----------------------------------------------
			channel.bind('pusher:subscription_succeeded', function() {
				onlineUsersList.update()
				isAuth = true;
				var onlineMorsers = channel.members.count;
				var channelNumber = channel.name.substr(11);
				document.getElementById("connecting-msg").innerHTML =
					"connected to channel "+channelNumber+"<br>"+
					"username: <a onclick='displaySenderInfo("+channel.members.me.id+")'>"+channel.members.me.info.username+"</a><br>"+
					onlineMorsers+" morser"+(onlineMorsers>1?"s":"")+" online";	
				document.getElementById("sidebar_username_disp").innerText = channel.members.me.info.username;
				console.log(channel.members)
			});
			channel.bind('pusher:subscription_error', function(status) {
				document.getElementById("connecting-msg").innerHTML = "<p>connection error. status: "+status+"</p>";
			});
			channel.bind('morsebroadcast', function(data) {
				lastMessageType = 0;//normal message
				var msgsender = channel.members.get(data.sender);
				var nameToDisplay = data.sender == channel.members.me.id?"you":msgsender.info.username;
					chat.insertMorsingMsg(data.sender,nameToDisplay,data.message);
					onlineUsersList.removeMorser(data.sender);
			});
			channel.bind('pusher:member_added', function(member){
				onlineUsersList.update()
				var onlineMorsers = channel.members.count;
				//if the user joining previously leaved the same room and the message telling it is the last received
				if(lastMessageType != 0 && lastPersonId == member.id){
				console.log("still him")
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
					onlineMorsers+" morsers online</span></p>",
					true//beep
					);
				console.log("new member")
				console.log(member)			
				}

			});
			channel.bind('pusher:member_removed', function(member) {
				onlineUsersList.update()
				var onlineMorsers = channel.members.count;
				//if the message telling the user joined is the last received
				if(lastMessageType != 0 && lastPersonId == member.id){
				console.log("still him")
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
					onlineMorsers+" morser"+(onlineMorsers>1?"s":"")+" online</span></p>",true
					);
				console.log("removed member")
				console.log(member)
				}

			});
			channel.bind('startedkeying', function(data) {
				console.log("someone started morsing")
				onlineUsersList.addMorser(data.sender);
			});
			channel.bind('stoppedkeying', function(data) {
				console.log("someone stopped morsing")
				onlineUsersList.removeMorser(data.sender);
			});			
			//----------------------------------------------			
		}
	console.log(ch);
}



/*
object to manage the online users list
-open/close/toggle
and show the ones that are morsing
*/
var onlineUsersList = {
	
	showingUserList: false,
	
	toggle: function(){
		if(!this.showingUserList){
			document.getElementById("users-list").style.display = "block";
			this.showingUserList = true;
		}else{
			this.close();
		}
	},
	close: function(){
		this.update()
		this.showingUserList = false;
		document.getElementById("users-list").style.display = "none";		
	},
	
	//list of the id of all the users typing
	morsingUsers: [],
	
	addMorser: function(id){
		//add user to the morsing list and update the display div
		if(this.morsingUsers.indexOf(id) < 0){
			this.morsingUsers.push(id)
		}
		this.update();		
	},
	removeMorser: function(id){
		//remove user from the morsing list and update the display div
		var index = this.morsingUsers.indexOf(id)
		if(index > -1){
			this.morsingUsers.splice(index, 1);
		}
		this.update();		
	},		
	update: function(){
		var html = "";
		for(var k in channel.members.members){
			var member = channel.members.members[k]
			if(member.id !== channel.members.me.id){
				html += "<a onclick='displaySenderInfo("+member.id+")'>"+member.username;
				//if this user is in the morsing list
				if(this.morsingUsers.indexOf(member.id) > -1){
					html += "<span class=\"spinner\"><div class=\"bounce1\"></div><div></div></span>";
				}
				html += "</a>";
			}
		}
		document.getElementById("sidebar_online_disp").innerHTML = html;
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

//when the blue name on the left of a msg is clicked
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
//when the scrolldown radio bt is clicked
function scrollDown(){
	document.getElementById("radiobt").style.display = "none";
	chatId.scrollTop = chatId.scrollHeight;
	if(viewTagDisplaied){
		viewedMessages = true;
	}
}