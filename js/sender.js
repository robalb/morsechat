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
	},
	stopCountDown: function(){
		this.countDownCtrl = 0;
	},
	update: function(){
		if(this.countDownCtrl==0){
			log("send countdown interrupted. progress bar removed")
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
		log("made it to "+settings.phraseInactivityTime+"! sending the message")
		//reset and makes invisible the progress bar
		barId.style.height = "0px";
		barId.style.width = "0px";
		if(isAuth){
			var encodedMsg = webEncode(this.msg);
			var xhr = new XMLHttpRequest();
			xhr.open('GET', 'app/send.php?msg='+encodedMsg);
			xhr.onload = function(){
				if (xhr.status === 200) {
					log(xhr.statusText)
				}
				else{
					insertMsg("<p>error " +  xhr.status + " " + xhr.statusText + "</p>");
				}
			};
			xhr.send();
		}else{
			insertMsg("<p>failed to broadcast the message. <br> you are not connected to a channell</p>");
		}		
		morseKey.phrase="";
		phraseDisplayId.innerHTML = "";		
	}
}

