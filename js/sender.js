/*
sender:

by calling the startcountdown method, a progress bar is created and rendered on the page.
if not stopped, when it reaches the end the typed message is sent to the server via an ajax call.

*/
sender = {
	
	countDownCtrl: 0,
	msg:"",
	
	startCountDown: function(msg){
		this.msg = msg;
		this.countDownCtrl = Date.now();
		this.update();
		//this make visible the progress bar
		barId.style.height = "2px";
		console.log("started a "+settings.phraseInactivityTime+"ms countdown")			
	},
	stopCountDown: function(){
		this.countDownCtrl = 0;
	},
	update: function(){
		if(this.countDownCtrl==0){
			console.log("send countdown interrupted. progress bar removed")
			//reset and makes invisible the progress bar
			barId.style.height = "0px";
			barId.style.width = "0px";
		}else{
			//get the milliseconds passed since the function started
			var progress = Date.now() - this.countDownCtrl;
			if(progress<settings.phraseInactivityTime){
				//set the bar width according to the loading percentage
				barId.style.width = (progress*100/settings.phraseInactivityTime) + "%";
				//graphic acceleration stuff
				window.requestAnimationFrame(function(){sender.update()});
			}else{
				this.send();
			}
		}
	},
	send: function(){
		//msg sent. the user is not keying anymore
		morseKey.keying = false;
		
		console.log("made it to "+settings.phraseInactivityTime+"! sending the message")
		//reset and makes invisible the progress bar
		barId.style.height = "0px";
		barId.style.width = "0px";
		if(isAuth){
			var encodedMsg = morse.webEncode(this.msg);
			var xhr = new XMLHttpRequest();
			xhr.open('GET', 'app/send.php?msg='+encodedMsg);
			xhr.onload = function(){
				if (xhr.status === 200) {
					console.log(xhr.statusText)
				}
				else{
					chat.insertMsg("<p>error " +  xhr.status + " " + xhr.statusText + "</p>",true);
				}
			};
			xhr.send();
		}else{
			chat.insertMsg("<p>failed to broadcast the message. <br> you are not connected to a channell</p>",true);
		}		
		morseKey.phrase="";
		phraseDisplayId.innerHTML = "";		
	},
	
	updateKeyingStatus: function(started){//true->started; false->stopped
		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'app/status.php?status='+started);
		xhr.onload = function(){
			console.log("update status xhr: " +  xhr.status + " " + xhr.statusText);
		};
		xhr.send();
	}

}

