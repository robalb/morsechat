var chat = {
	//used to control scrollDown button
	viewTagDisplaied: false,
	viewedMessages: false,
	
	
	//this method adds a msg to the chat in the proper way, controlling scroll, new messages notification and scroll down radio bt
	insertMsg: function(msgBody){
		//check if user is at the bottom of the chat. if its not (probably reading an old msg) the function
		//don't scroll down automatically and displays the #radiobt instead
		var dontScrollDown = (chatId.scrollTop < (chatId.scrollHeight - chatId.offsetHeight));

		if(dontScrollDown){
			//display scroll down radio bt
			document.getElementById("radiobt").style.display = "block";

			//remove old existing tag if messages have already been read
			if(this.viewTagDisplaied && this.viewedMessages){
				this.viewedMessages = false;
				this.viewTagDisplaied = false;
				var unreadMsgId = document.getElementById("unread-msg");
				unreadMsgId.outerHTML = "";
				delete unreadMsgId;
			}					
			//add unread messages tag if it doesn't exist
			if(!this.viewTagDisplaied){
				this.viewTagDisplaied = true;
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

	},
	
	//array of objects from MorseMsg function constructor
	activeMorsers: [],
	updatingMorsers: false,
	
	insertMorsingMsg: function(senderObj,nameToDisplay,encodedMsg){
		//adds the blank message to the dom
		//i'm using " " instead of ' ' because reasons.
		var html = "<p class='msg-normal'><a onclick='displaySenderInfo("+senderObj+")'>"+
			nameToDisplay+"</a>: <span class='msg-phrase' ></span><span class='msg-letter' ></span></p>";	
		this.insertMsg(html);
		//get position in the dom
		var domPos = document.getElementsByClassName("msg-phrase").length -1;
		
		var arrayPos = this.activeMorsers.length;
		//instantiate object
		this.activeMorsers[arrayPos] = new Morser(domPos,encodedMsg);
		//start recursive updating
		if(this.updatingMorsers == false){
		this.updatingMorsers = true;
		this.updateMorsers();
		}
		
	},
	
	updateMorsers: function(){
		var arrLength = this.activeMorsers.length;
		console.log("array length "+arrLength)
		if( arrLength > 0){
			for(var i = 0; i < arrLength; i++){
				console.log("iterating pos"+ i)
				var hasFinished = this.activeMorsers[i].update();
				//remove the object from the array if it has finished its job
				if(hasFinished){
					//TODO: see if this removes object from memory/gets garbage collected or remains
					this.activeMorsers.splice(i,1);
					//since we removed an element, we have to update the length variable for the loop
					arrLength--;
					console.log("killed");
				}
				console.log("updating");
			}
			this.updaterTimer = setTimeout( ()=>{this.updateMorsers()},1000);//sostituire con settings.morserDotSpeed
		}else{
			this.updatingMorsers = false;
		}
	}
	
}




function Morser(domPosition,encodedMsg){
	this.domPos = domPosition;
	this.encodedMsg = encodedMsg;
	this.phrase = webDecode(this.encodedMsg).split("");
	this.letter = [];
	
	this.finishedMorsing = false;
	//document.getElementsByClassName("msg-phrase")[this.domPos].innerText = webDecode(this.encodedMsg);
	
	this.update = function(){
		if(this.phrase.length > 0){
			var msg = document.getElementsByClassName("msg-phrase")[this.domPos];
			
			msg.insertAdjacentHTML("beforeend",this.phrase.shift() );
			
		}else{
			this.finishedMorsing = true;
		}
		return this.finishedMorsing;
	}
	
}


