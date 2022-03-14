#page specific imports
from flask import g, session
from flask_expects_json import expects_json
from flask_login import login_required, current_user
from app import pusher

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
    if current_user.is_authenticated:
        #TODO: authenticated users check
        pass
    elif 'anonymous_callsign' in session:
        #TODO anonymous users check
        pass
    else:
        return error("pusher_auth_denied", code=403)

    #TODO:
    #put here shadow ban logic

    # pusher_client is obtained through pusher_client = pusher.Pusher( ... )
    auth = pusher.client.authenticate(
            channel=g.data['channel_name'],
            socket_id=g.data['socket_id'],
            custom_data={
                u'user_id': u'1',
                u'user_info': {
                    u'twitter':
                    u'@pusher'
                    }
                }
            )
    return success(auth)


