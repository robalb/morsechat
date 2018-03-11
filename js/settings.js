var settings = {
	//#############################
	//       morse settings
	//#############################
	
	//list of the default morse elements multipliers. this array is used to restore default settings
	defaultMultipliers: [80,3,1,3,5,2000],
	//second list of multipliers: this array can be used to store custom values and apply them
	newMultipliers: [80,3,1,3,5,2000],
	//customizable morse parameters. their values are set on page load, or from the page settings
	//by calling the applyMutlipliers() method
	/*
	dashLength,
	elementsPause,
	charactersPause,
	wordsPause,
	phraseInactivityTime,
	*/
	updateMultiplier: function(elementToUpdate,newVal){
		//update graphic part of html slider
		if(elementToUpdate == 0){
			document.getElementById("dotSpeedDisp").text = newVal;
		}
		//validate input
		if(newVal>0&&((newVal<=500)||(elementToUpdate==5&&newVal<=4000)) ){
			//add the new input to the second multipliers list
			this.newMultipliers[elementToUpdate]=newVal;
			log("applying multipliers");
			//apply the second multiplier list to the morse elements length
			this.applyMultipliers(this.newMultipliers);
		}
	},
	restoreDefaultMultipliers: function(){
		log("applying default multipliers");
		this.applyMultipliers(this.defaultMultipliers);
		this.newMultipliers = this.defaultMultipliers.slice(0);
	},

	applyMultipliers: function(applyList){
		//not sure about this..
/* 		applyList = this.hasOwnProperty(applyListName) ? settings[applyListName] : this.defaultMultipliers;
		console.log(this.hasOwnProperty(applyListName)); */
		//update variables
		var dotSpeed = applyList[0];
		this.dashLength = dotSpeed*applyList[1];
		this.elementsPause = dotSpeed*applyList[2];
		this.charactersPause = dotSpeed*applyList[3];
		this.wordsPause = dotSpeed*applyList[4];
		this.phraseInactivityTime = applyList[5];
		//update graphic part
		document.getElementById("dotSpeedDisp").text = applyList[0];
		document.getElementById("dotWpmDisp").text = Math.floor(1200/applyList[0]);
		document.getElementById("speedRange").value = applyList[0];
		var x = document.getElementsByClassName("tElement");
		for(var i=0;i<x.length;i++){
			x[i].value = applyList[i+1];
		}
	},
	
	
	dumpAsString: function(){
		//performs a sort of home made serialization.
		//note: base64 of json data was probably better
		var stringD="";
		this.newMultipliers.forEach(function(s){
			stringD+="x"+s
			});
		popup("export code","<p>this is your configuration code. Keep it somewhere safe.</p><p><b>"+stringD+"</i></p><br>");
	},
	importFromString: function(){
		//get the previously exported settings string
		var rString = document.getElementById("stringInput").value;
		var sr = rString.split("x");
		//validate input string
		if(sr.length == 7){
			for(var i=1;i<7;i++){
				log(sr[i]);
				if(parseFloat(sr[i])>0&&parseFloat(sr[i])<=4000){
					this.newMultipliers[i-1]=parseFloat(sr[i]);
				}else{
					log("invalid value");
					this.newMultipliers[i-1] = this.defaultMultipliers[i-1];
				}
			}
			this.applyMultipliers(this.newMultipliers);
		}else{
			popup("import error","<p>Invalid code!</p>");
		}
	},
	//#############################
	//       sound settings
	//#############################
	keySound: true,
	receivedMorseSound: true,
	
	toggleKeySound: function(){
		if(this.keySound){
			this.keySound = false;
			document.getElementById("ksbutton").innerText = "enable key sound";
		}else{
			this.keySound = true;
			document.getElementById("ksbutton").innerText = "disable key sound";
		}
	},
	toggleReceivedSound: function(){
		if(this.receivedMorseSound){
			this.receivedMorseSound = false;
			document.getElementById("rmbutton").innerText = "unmute received morse";
		}else{
			this.receivedMorseSound = true;
			document.getElementById("rmbutton").innerText = "mute received morse";
		}	
	}


}
