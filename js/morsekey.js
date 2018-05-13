/**
* morsekey:
* this morsekey object can be pushed down or pushed up  by using the methods down() and up().
* up and down are translated into dot and dashes
* dot and dashes are translated into a letter
* the letter is added to the phrase buffer
* 
* if up or down are not called, the morsekey starts the sender object, that 
* broadcasts the phrase typed after a delay
*/
var morseKey = {
	//identifier id for timer that calls up() if the key has been down for too long
	//dashTimer,

	//identifier id for timer that calls the function pushword() after a given time of inactivity.
	//this function decode the morse stored in var letter into a string and push it to var phrase
	//spaceTimer,
	
	//state of the key
	isDown: false,

	//timestamp of the moment the key is pushed down
	startHold: 0,

	//current letter and current phrase buffers
	letter: "",
	phrase: "",
	
	//if the user is morsing. used for the 'user is typing' message
	keying: false,
	
	//called when a key, or a button, or a touch key is pressed
	down: function(){
		if(!this.isDown){this.isDown = true;
			
		//stop the timer that would otherwise call the method pushword() if inactive for too much
		clearTimeout(this.spaceTimer);
		//stop the sender from broadcasting the msg
		sender.stopCountDown();
		//memorize the current timestamp. used to recognize dot/dash length
		this.startHold = Date.now();
		//infinite-length dash prevention timer
		var _this = this;// if only ie supported arrow functions..
		this.dashTimer = setTimeout(function(){
			//_this.isDown = false;
			_this.up();
			console.log(morseKey)
			console.log("holded dash for too long. released it")
		},settings.dashLength*3);
		
		//add graphic effect to the key
		keyId.style.backgroundColor = "#404040";
		
		//play audio if enabled
		if(audioSupport && settings.keySound){
			this.o = context.createOscillator()
			this.o.frequency.value = 1175
			this.g = context.createGain()
			this.o.connect(this.g)
			this.g.connect(context.destination) 
			this.o.start(0)
			}
			
	}},
	
	
	
	//called when a key, or a button, or a touch key is released
	//except for when one of these inputs has been down for too much, and up() has already
	//been called by dashTimer
	up: function(){
		if(this.isDown){this.isDown = false;
		
		clearTimeout(this.dashTimer);
		
		//remove graphic effect from the key
		keyId.style.backgroundColor = "#212121";
		//calculates the hold time (stop time - start time)
		var holdTime = Date.now() - this.startHold;
		//determines from holdTime wether to add dot or dash to the letter buffer
		this.letter += ""+(holdTime>settings.dashLength?"1":"0");
		console.log("letter is now "+this.letter)
		//also add the dot/dash to the chat
		letterDisplayId.insertAdjacentText("beforeend",(holdTime>settings.dashLength?"_":"."));
		//start the timer for the function that decode into a letter the morse in the var letter, and add it
		//to the phrase buffer. this timer is stopped if down() is called before its sleep time has passed
		var _this = this;
		this.spaceTimer = setTimeout(function(){_this.pushWord()},settings.charactersPause);
		
		//stop audio if enabled
		if(audioSupport && settings.keySound){
			this.o.stop(context.currentTime);
			//g.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.01)//not working
		}
	
	}},
	
	
	pushWord: function(){
		//if the letter is [backspace] 
		if(this.letter == "000000"){
			//removes the last letter from the phrase buffer
			this.phrase = this.phrase.slice(0,-1);
			//updates the phrase display
			phraseDisplayId.innerText = this.phrase;
			console.log("undo")
			console.log("phrase is now "+this.phrase)
			if(this.phrase.length > 0){
				var _this = this;
				this.spaceTimer = setTimeout(function(){_this.pushSpace()},settings.wordsPause);
			}else{
				if(this.keying){
					sender.updateKeyingStatus(false);//true->started keying, false->stopped keying
					this.keying = false;
					console.log("stopped keying");					
				}
				chat.insertMsg("<p>message removed</p>",false);			
			}
		}else{
			//if it's the third word of the phrase, broadcast that the user has started typing.
			//(wait to the 3rd letter instead of doing it immediately to save broadband)
			if(!this.keying && this.phrase.length == 3){
				sender.updateKeyingStatus(true);//true->started keying, false->stopped keying
				this.keying = true;
				console.log("started keying")
			}
			//store the letter in phrase buffer. spaces are stored as uppercase J and special chars are encoded in other
			//uppercase letters by function webEncode. non existing letters [[are stored as upercase K]] are not stored
			this.phrase += ""+(morse.tree[this.letter]?morse.tree[this.letter]:"");
			//add translated letter to the phrase screen
			var rt = morse.tree[this.letter]?morse.tree[this.letter]:"<span>|</span>";
			phraseDisplayId.insertAdjacentHTML("beforeend",rt);
			console.log("decoded "+this.letter+" into "+rt);
			//reset the letter buffer and clear the letter screen
			this.letter = "";
			letterDisplayId.innerText = "";
			console.log("letter added to phrase")
			console.log("phrase is now "+this.phrase)
			//start timer to push space
			var _this = this;
			this.spaceTimer=setTimeout(function(){console.log(_this);_this.pushSpace()},settings.wordsPause);
		}
		//reset the letter buffer and clear the letter screen
		this.letter = "";
		letterDisplayId.innerText = "";
		
	},
	pushSpace: function(){
		//add space to the phrasebuffer
		this.phrase+=" ";
		//add space to the phrase screen
		phraseDisplayId.insertAdjacentHTML("beforeend"," ");
		console.log("added space");
		//start the sendmessage countdown function, with graphic acceleration.
		// when it reaches 100%, the current phrase stored in the phrase buffer is sent to the server
		//to stop it, set countDownCtrl to 0; to start set countDownCtrl to the current timestamp
		sender.startCountDown(this.phrase);	
	}
}

