# morsechat

a morse code only web chatroom.

[![Website](https://img.shields.io/website-up-down-green-red/http/halb.it.svg?label=morse%20chat)](http://halb.it/morsecode)
![GitHub last commit](https://img.shields.io/github/last-commit/robalb/morsechat.svg)
![license](https://img.shields.io/github/license/robalb/morsechat.svg)
![GitHub language count](https://img.shields.io/github/languages/count/robalb/morsechat.svg)
![badges](https://img.shields.io/badge/cool%20badges-5-brightgreen.svg)


this project is based on the [pusher](https://www.pusher.com) library.

## installing

you need php v5.4 or above, with cUrl and json modules.

Insert your pusher api credentials in app/config.php. You can get them by registering a free account on pusher.com

You can also configure the admin credentials for the chatroom by inserting your username and a bcrypt hash of your password
in app/config.php. Use the file makepassword.php with get parameter ?password=yourpassword  to generate a correct hash


