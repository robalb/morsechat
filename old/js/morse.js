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
		"10101":" "//TODO: fix this: remove J from beginning of received msgs
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
    /**
    * escape special chars, to avoid conflicts in a regexp
    * @param {string} text - the string to escape
    * @return {string} the escaped string
    */
	escapeRegExp: function(text){
		return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
	},
    /**
    * encode spaces and symbols into uppercase letters according to the specialChars array
    * @param {string} - the string to encode 
    * @return {string} the encoded string
    * @example
    * //returns 'fooJbarE'
    * webEncode('foo bar!')
    */
	webEncode: function(string){
		var dString = string;
		for (var key in this.specialChars) {
				var rg = new RegExp(this.escapeRegExp(this.specialChars[key]), 'g')
					dString = dString.replace(rg,key);
		}
		console.log("encoded phrase to "+dString)
		return dString;
	},
    /**
    * decode uppercase letters into spaces and symbols according to the specialChars array
    * @param {string} - the string to decode
    * @return {string} the decoded string containing spaces and special chars
    * @example
    * //returns 'foo bar!'
    * webEncode('fooJbarE')
    */
	webDecode: function(string){
		var dString = string;
		for (var key in this.specialChars) {
			dString = dString.replace(new RegExp(key, 'g'),this.specialChars[key]);
		}
		return dString.toLowerCase();
	},
    /**
    * return the morse equivalent of the char provided, according to the array tree
    * @param {string} - the letter to decode
    * @return {array} an array containing 0(dit) or 1(dah), of variable length
    * or null if the letter is not found
    * @example
    * //returns [1,0,1,0]
    * translateLetterToMorse('c')
    * @example
    * //returns null
    * translateLetterToMorse('^')
    */
	translateLetterToMorse: function(value){
		for(var key in this.tree){
			if(this.tree[key] == value) return key.split("");
		}
		return null;
	}



}
