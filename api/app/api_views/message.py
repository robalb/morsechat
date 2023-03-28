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
import time

#basic imports
from . import api
from ._utils import success, error, process_message

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
    #make sure the user is connected to a channel
    if session['authorized_channel'] is None:
        return error("no_authorized_channel")

    if current_user.is_authenticated:
        #Set callsign and uid for logged users
        uid = current_user.username
        callsign = current_user.callsign
    elif 'anonymous_callsign' in session:
        #Set callsign and uid for anonymous users
        uid = session['anonymous_id']
        callsign = session['anonymous_callsign']
    else:
        return error("unauthorized", details="no_valid_session")

    #validate and get message length in seconds
    processed = process_message(g.data['message'], g.data['dialect'])

    #anomalies detected in the message
    if processed['anomalies']:
      return error("invalid_message")

    #Ratelimiting:
    if 'last_message_timestamp' in session:
      time_delta = time.time() - session['last_message_timestamp']
      #calculate the cooldown time
      cooldown_time = app.config['MESSAGE_COOLDOWN']
      #apply a multiplier in case of suspicious users
      if g.data['wpm'] > 30:
        cooldown_time *= app.config['SUSPICIOUS_MULPTIPLIER']
      #compare the message length with the time passed since the last message received
      if time_delta < cooldown_time or time_delta < processed['length']:
        app.logger.info(f"too_many_requests: {int(time_delta)} / {cooldown_time}")
        return error("too_many_requests", code=429)

    #update the last message timestamp
    session['last_message_timestamp'] = time.time()

    message_data = {
             'id': uid,
             'callsign': callsign,
             'message': processed['message'],
             'dialect': g.data['dialect'],
             'wpm': g.data['wpm']
         }
    app.logger.info(message_data)
    pusher.trigger(
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
    elif 'anonymous_id' in session:
        uid = session['anonymous_id']
    else:
        return error("unauthorized", details="no_valid_session")

    pusher.trigger(
         session['authorized_channel'],
         'typing',
         {
             'id': uid
         }
    )
    return success("")
