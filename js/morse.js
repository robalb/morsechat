var morse = {
	tree: {
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
		"001100":"?",
		"011110":"\'",
		"101011":"!",
		"10010":"/",
		"111000":":",
		"101010":";",
		"10001":"=",
		"100001":"-",
		"01010":"+",
		"011010":"@",
		//"000000":"cancel",
		"01111":"1",
		"00111":"2",
		"00011":"3",
		"00001":"4",
		"00000":"5",
		"10000":"6",
		"11000":"7",
		"11100":"8",
		"11110":"9",
		"11111":"0",
		"00000010":" "
	},
	specialChars: {
		"A":".",
		"B":",",
		"C":"?",
		"D":"\'",
		"E":"!",
		"F":"/",
		"G":":",
		"H":";",
		"I":"=",
		"L":"-",
		"M":"+",
		"N":"@",
		
		"J":" ",
		"K":"|"

	},
	escapeRegExp: function(text){
		return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
	},
	webEncode: function(string){
		var dString = string;
		for (var key in this.specialChars) {
				var rg = new RegExp(this.escapeRegExp(this.specialChars[key]), 'g')
					dString = dString.replace(rg,key);
		}
		console.log("encoded phrase to "+dString)
		return dString;
	},

	webDecode: function(string){
		var dString = string;
		for (var key in this.specialChars) {
			dString = dString.replace(new RegExp(key, 'g'),this.specialChars[key]);
		}
		return dString.toLowerCase();
	},

	translateLetterToMorse: function(value){
		for(var key in this.tree){
			if(this.tree[key] == value) return key.split("");
		}
		return null;
	}



}
