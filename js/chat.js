var chat = {
	//used to control scrollDown button
	viewTagDisplaied: false,
	viewedMessages: false,
	
	
	//this method adds a msg to the chat in the proper way, controlling scroll, new messages notification and scroll down radio bt
	insertMsg: function(msgBody,beep){
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
		
			if(beep === true && audioSupport && settings.keySound){
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
	
	frequencies: [1046,987,880,784,698],
	lastFrequencyUsed: 0,
	
	insertMorsingMsg: function(senderObj,nameToDisplay,encodedMsg){
		//adds the blank message to the dom
		//i'm using " " instead of ' ' because reasons.
		var html = "<p class='msg-normal'><a onclick='displaySenderInfo("+senderObj+")'>"+
			nameToDisplay+"</a>: <span class='msg-phrase' ></span> <span class='msg-letter' ></span></p>";	
		this.insertMsg(html,false);
		//get position in the dom
		var domPos = document.getElementsByClassName("msg-phrase").length -1;
		var arrayPos = this.activeMorsers.length;
		var noteFreq = this.frequencies[this.lastFrequencyUsed];
		this.lastFrequencyUsed = this.lastFrequencyUsed<this.frequencies.length-1?this.lastFrequencyUsed+1:0;
		//instantiate object
		this.activeMorsers[arrayPos] = new Morser(domPos,encodedMsg,noteFreq);
		//start recursive updating
		if(this.updatingMorsers == false){
			this.updatingMorsers = true;
			this.updateMorsers();
		}
		console.log("spawned morser");
		
	},
	
	updateMorsers: function(){
		var arrLength = this.activeMorsers.length;
		//console.log("array length "+arrLength)
		if( arrLength > 0){
			for(var i = 0; i < arrLength; i++){
				//console.log("iterating pos"+ i)
				var hasFinished = this.activeMorsers[i].update();
				//remove the object from the array if it has finished its job
				if(hasFinished){
					//TODO: see if this removes object from memory/gets garbage collected or remains
					this.activeMorsers.splice(i,1);
					//since we removed an element, we have to update the length variable for the loop
					arrLength--;
					console.log("morser terminated");
				}
				//console.log("updating");
			}
			var _this = this;//top 5 reasons to hate internet explorer
			this.updaterTimer = setTimeout( function(){_this.updateMorsers()},settings.morserDotSpeed);
		}else{
			this.updatingMorsers = false;
		}
	}
	
}




function Morser(domPosition,encodedMsg,noteFreq){
	this.msgP = document.getElementsByClassName("msg-phrase")[domPosition];
	this.msgL = document.getElementsByClassName("msg-letter")[domPosition];
	this.noteFreq = noteFreq;
	this.encodedMsg = encodedMsg;
	this.phrase = morse.webDecode(this.encodedMsg).split("");
	this.currentLetter = this.phrase.shift();
	this.currentLetterMorse = morse.translateLetterToMorse(this.currentLetter);
	this.steps = 2;//initial delay

	this.finishedMorsing = false;
	//document.getElementsByClassName("msg-phrase")[this.domPos].innerText = morse.webDecode(this.encodedMsg);
	
	this.update = function(){
		if(this.steps > 0){
			this.steps--;
		}else{
		//------------------------------------------			
			if(this.phrase.length > 0){
				if(this.currentLetterMorse.length > 0){
					var dt = this.currentLetterMorse.shift();
					this.steps = dt==0?1:3;//dot-dash
					this.msgL.insertAdjacentHTML("beforeend",dt==0?".":"_");
					if(audioSupport && settings.receivedMorseSound){
						var o = context.createOscillator()
						o.frequency.value = this.noteFreq;
						var g = context.createGain()
						o.connect(g)
						g.connect(context.destination) 
						o.start(0)
						//TODO: calculate properly. i've got this by trial and error
						//put limit to dot length(a dot is alwais a dot, even with super slow morse)
						var beepLength = settings.morserDotSpeed/(100*(dt==0?6:2.8))
						//g.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1 + beepLength)
						o.stop(context.currentTime+beepLength)
					}					
				}else{
					this.msgL.innerText = "";
					this.msgP.insertAdjacentHTML("beforeend",this.currentLetter);	
					this.currentLetter = this.phrase.shift();
					if(this.currentLetter == " "){
						this.steps = 7;//pause between words
					}else{
						this.steps = 3;//pause between characters
						this.currentLetterMorse = morse.translateLetterToMorse(this.currentLetter);						
					}
				}	
			}else{
				this.finishedMorsing = true;
			}			
		//------------------------------------------	
		}
	
		return this.finishedMorsing;
	}
}


