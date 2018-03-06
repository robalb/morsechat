[![Website](https://img.shields.io/website-up-down-green-red/http/halb.it.svg?label=morse%20chat)](http://halb.it/morsecode)
![Online](https://img.shields.io/badge/dynamic/json.svg?label=online%20users&uri=http%3A%2F%2Fwww.halb.it%2Fmorsecode%2Fapp%2Fgetonline.php&query=%24..online_users)
![Channels](https://img.shields.io/badge/dynamic/json.svg?label=active%20channels&uri=http%3A%2F%2Fwww.halb.it%2Fmorsecode%2Fapp%2Fgetonline.php&query=%24..channels)

![GitHub last commit](https://img.shields.io/github/last-commit/robalb/morsechat.svg)
![license](https://img.shields.io/github/license/robalb/morsechat.svg)

# morsechat

a morse code web chatroom, perfect for practicing and learning morse code.

this project is based on the [pusher](https://www.pusher.com) library.

## getting started

you need php version 5.4 or above, with cUrl and json modules.

Insert your pusher api credentials in app/config.php. You can get them by registering a free account on pusher.com

You can also configure optional admin credentials for the chatroom by inserting your username and a bcrypt hash of your password
in app/config.php. Use the file makepassword.php with get parameter ?password=yourpassword  to generate a valid hash


