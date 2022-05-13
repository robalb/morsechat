#page specific imports
from flask import g, session
from flask_expects_json import expects_json
from argon2 import PasswordHasher
from flask_login import login_user, logout_user, login_required, current_user
from ._procedures import Data_modules
from .. import db_connection
from .. import flask_login_base
from .. import app
from app import pusher

#basic imports
from . import api
from ._utils import success, error

schema = {
    'type': 'object',
    'properties': {
        'message': {
            'type': 'array',
            'items': {
                'type': 'integer',
                'minimum': 0,
                'maximum': 6 * 1000
            }
        },
        'dialect': {'type': 'string', 'maxLength':20, 'minLength':1 },
        'wpm': {'type': 'integer', 'minimum':5, 'maximum':50 },
    },
    'required': ['message', 'dialect', 'wpm'],
}
@api.route('/message', methods=['POST'])
@expects_json(schema)
def api_message():
    if session['authorized_channel'] is None:
        return error("no_authorized_channel")

    if current_user.is_authenticated:
        uid = current_user.username
        callsign = current_user.callsign
    elif 'anonymous_callsign' in session:
        uid = session['anonymous_callsign']
        callsign = uid
    else:
        return error("unauthorized", details="no_valid_session")

    message_data = {
             'id': uid,
             'callsign': callsign,
             'message': g.data['message'],
             'dialect': g.data['dialect'],
             'wpm': g.data['wpm']
         }
    app.logger.info(message_data)
    pusher.client.trigger(
         session['authorized_channel'],
         'message',
         message_data
    )
    return success("")


@api.route('/typing', methods=['POST'])
def api_typing():
    if session['authorized_channel'] is None:
        return error("no_authorized_channel")

    if current_user.is_authenticated:
        uid = current_user.username
    elif 'anonymous_callsign' in session:
        uid = session['anonymous_callsign']
    else:
        return error("unauthorized", details="no_valid_session")

    pusher.client.trigger(
         session['authorized_channel'],
         'typing',
         {
             'id': uid
         }
    )
    return success("")
