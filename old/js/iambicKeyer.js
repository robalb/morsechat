var iambicKeyer = {
	/*
	state:
		0 -> silence
		1 -> left is down(only dot timer)
		2 -> both left and right down
		3 -> right is down(only dash timer)
	*/
	state: 0,
	alternateKey: 1,
	
	down: function(paddle){
		//TODO: optimize this block
		var l;
		if(settings.paddleLeftIsDot){
			l = paddle;
		}else{
			l = paddle==1?3:1;
		}	
	
		//if the key pressed is not already down
		if(l != this.state && this.state != 2){
			//set the state to the code corresponding to the key pressed
			if(this.state == 0){
				this.state = l;
				clearTimeout(this.dt);
				this.player(true)
			}//set the state to 2 -> both keys down
			else{
				this.state = 2;
				this.alternateKey = l;
			}
		}
	},
	up: function(paddle){
		//TODO: optimize this block
		var l;
		if(settings.paddleLeftIsDot){
			l = paddle;
		}else{
			l = paddle==1?3:1;
		}	
		
		//if l is the same key that is now down, and its the only down
		if(l == this.state){
			this.state = 0;
		//if they are both down
		}else if(this.state == 2){
			//leave only the status of the other key
			this.state = l==1?3:1;
		}
	},

	player: function(beep){
		if(beep == false ){
			//call to the real up function
			morseKey.up();
			if(this.state != 0){
				var _this = this;
				this.dt = setTimeout(function f(){_this.player(true)}, settings.elementsPause);
			}
		}
		else{
			if(this.state != 0){
				//call to the real down function
				morseKey.down();
				var delay = 0;
				alternateKey = null;
				//dot
				if(this.state == 1){
					delay = settings.dotLength;
				}//dash
				else if(this.state == 3){
					delay = settings.dashLength;
				}//both, alternated
				else if(this.state == 2){
					//dot
					if(this.alternateKey == 1){
						delay = settings.dotLength;
						this.alternateKey = 3;
					}//dash
					else{
						delay = settings.dashLength;
						this.alternateKey = 1;						
					}
				}
				var _this = this;
				this.df = setTimeout(function f(){_this.player(false)}, delay);
				
			}
		}
	}

}
