# <img src="https://i.imgur.com/A8fVeyP.png" height="60"> Morsechat 

[![Website](https://img.shields.io/website-up-down-green-red/http/halb.it.svg?label=morse%20chat)](http://halb.it/morsecode)
[![Online](https://img.shields.io/badge/dynamic/json.svg?label=online%20users&uri=http%3A%2F%2Fwww.halb.it%2Fmorsecode%2Fapp%2Fgetonline.php&query=%24..online_users)](http://halb.it/morsecode)
[![Channels](https://img.shields.io/badge/dynamic/json.svg?label=active%20channels&uri=http%3A%2F%2Fwww.halb.it%2Fmorsecode%2Fapp%2Fgetonline.php&query=%24..channels)](http://halb.it/morsecode)
![license](https://img.shields.io/github/license/robalb/morsechat.svg)
[![docs](https://inch-ci.org/github/robalb/morsechat.svg?branch=master)](https://inch-ci.org/github/robalb/morsechat/)


A fully responsive morse code web chat that you can use to learn morse and comunicate with friends, without having to buy
a radio. This project is based on [@bkanker](https://twitter.com/bkanber)'s web app morsecode.me

Because of some restrictions of my shared hosting service, the websocket connections are handled by the third party service [pusher](https://www.pusher.com). The live website is currently limited to 200.000 messages per day (including the 'started typing' message) and max 100 cuncurrent connections.

## Requirements

* PHP 5.4 or higher, with cUrl and json modules
* [pusher](https://www.pusher.com) api keys

## Configuration

Insert your pusher api credentials in `app/config.php`  You can get them by registering a free account on pusher.com

In the same file you can also configure:

* the maximum number of channels available (default 7)
* the minimum number of seconds before an user can send another message (default 5s)
* chat admin username and password

note: the admin password must be a bcrypt hash. You can get a valid bcrypt hash of your password by using the file `app/makepassword.php` with get parameter `?password=yourpassword`


For example: opening `makepassword.php?password=hunter2` will return the bcrypt hash for the password hunter2

## Apis

You can get basic informations about the status of the chat from the script `app/getonline.php`.

The script returns the number of active channels and online users in json format.

Example: `{"channels":0,"online_users":0}`


