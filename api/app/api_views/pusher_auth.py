#page specific imports
from flask import g, session
from flask_expects_json import expects_json
from flask_login import login_required, current_user
from app import pusher, app

#basic imports
from . import api
from ._utils import success, error

schema = {
    'type': 'object',
    'properties': {
        'channel_name': {'type': 'string', 'maxLength':30, 'minLength':1 },
        'socket_id': {'type': 'string', 'maxLength':30, 'minLength':1 },
    },
    'required': ['channel_name', 'socket_id'],
    'maxProperties': 2
}
@api.route('/pusher_auth', methods=['POST'])
@expects_json(schema)
def api_pusher_auth():
    #prepare authentication response data
    uid = None
    anonymous = True
    callsign = None
    country = None
    username = None

    #validate the connection request for autheticated users
    if current_user.is_authenticated:
        uid = current_user.username
        anonymous = False
        callsign = current_user.callsign
        country = session['country']
        username = current_user.username

    #validate the connection request for anonymous users
    elif 'anonymous_id' in session:
        uid = session['anonymous_id']
        anonymous = True
        callsign = session['anonymous_callsign']
        country = session['country']
        #deny connession to pro channels if user is anonymous
        if 'pro' in g.data['channel_name']:
            return error("pusher_auth_denied", details="login_needed", code=403)

    #the user is neither logged nor anonymous (probably expired cookies)
    else:
        return error("pusher_auth_denied", code=403)
    
    auth = pusher.authenticate(
            channel=g.data['channel_name'],
            socket_id=g.data['socket_id'],
            custom_data={
                'user_id': uid,
                'user_info': {
                    'username': username,
                    'callsign': callsign,
                    'country': country,
                    'anonymous': anonymous
                    }
                }
            )

    #we track serverside the authorized channel name
    session['authorized_channel'] = g.data['channel_name']

    return success(auth)


