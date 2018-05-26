"use strict";

//initialize the app
document.addEventListener("DOMContentLoaded", function(event) {
   app.init(phpGlobals);
});

/**
* main app module
* @returns {function} init - the app init function 
*/
var app = (function(){
   //config variables
   var config = {
      CSS:{
         navbar:{
            usersList:{
               
            },
            chList:{
               //the ch list container
               chListId: "ch-list"
            }
         },
         sidebar:{
            
         },
         settings:{
            
         },
         morseList:{
            
         },
         body:{
            //progress bar
            barId: "timebar_bar",
            letterDisplayId: "letterDisp",
            phraseDisplayId: "phraseDisp",
            chatId: "chatContainer",
            keyId: "key"
         },
         popup:{
            
         }
      },
      pusher:{
         key: "",
         cluster: ""
      },
      maxChannels: 0
   };
   
   //object containing all the dom node elements
   var domElements = {};
   
   //audio api support state
   var audioSupport = true;
   //the audio api context, generated if supported.
   var audioCtx;
   /**
   * function that generate and audio api instance, or
   * set audioSupport to false on fail
   * @private
   */
   function initAudio(){
      if (typeof AudioContext !== "undefined") {
         audioCtx = new AudioContext();
      } else if (typeof webkitAudioContext !== "undefined") {
         audioCtx = new webkitAudioContext();
      } else if (typeof window.webkitAudioContext !== "undefined") {
         audioCtx = new window.webkitAudioContext();
      } else if (typeof window.AudioContext !== "undefined") {
         audioCtx = new window.AudioContext();
      } else if (typeof mozAudioContext !== "undefined") {
         audioCtx = new mozAudioContext();
      } else{
         audioSupport = false;
      }
   }
   
   /**
   * init app modules, that need to be loaded before this code is executed
   * all the modules are in the global scope
   */
   function initModules(){
      settings.init(config.CSS.settings);
   }
   
   /** 
   * initialize the app:
   * creates the pusher instance and all the dom event listeners, and generates part of the html
   *
   *@param {object} phpGlobals - the settings variables received from php: 
   *  'PUSHER_KEY' {string} - the pusher public key
   *  'PUSHER_CLUSTER' {string} - the pusher cluster
   *  'MAX_CHANNELS' {integer} - the max number of aviable channels
   */
   var init = function(phpGlobals){
      //update the config object with the php variables
      config.pusher.key = phpGlobals.PUSHER_KEY;
      config.pusher.cluster = phpGlobals.PUSHER_CLUSTER;
      config.maxChannels = phpGlobals.MAX_CHANNELS;
      //initialize the audio apis
      initAudio();
      //get the dom nodes
      
      //initialize modules
      initModules();
        //settings module
        //pusher module
      
      //initialize dom listeners
      
      
   }

   return{
      init: init
   }
}());

var oX1101o = true;