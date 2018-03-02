# morsechat

a morse code only web chatroom.

this project is based on the [pusher](https://www.pusher.com) library.

## installing

you need php v5.4 or above, with cUrl and json modules.

Insert your pusher api credentials in app/config.php. You can get them by registering a free account on pusher.com

You can also configure the admin credentials for the chatroom by inserting your username and a bcrypt hash of your password
in app/config.php. Use the file makepassword.php with get parameter ?password=yourpassword  to generate a correct hash


