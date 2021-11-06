#page specific imports
from flask import g, session
from flask_expects_json import expects_json
from email.utils import parseaddr
from argon2 import PasswordHasher
from flask_login import login_user, current_user
import time
from .. import db_connection
from .. import flask_login_base
from .. import app
from ._procedures import validate_callsign

#basic imports
from . import api
from ._utils import success, error, clearly_a_profanity

schema = {
    'type': 'object',
    'properties': {
        'email': {'type': 'string', 'maxLength':255, 'minLength':6 },
        'username': {'type': 'string', 'maxLength':20, 
                     'minLength':3, "pattern": "^[A-Za-z0-9-_]+$"
                     },
        'password': {'type': 'string', 'maxLength':255, 'minLength':8 },
        'callsign': {
            'type': 'object',
            'properties': {
                'code': {'type': 'string', 'maxLength':90, 'minLength':6 },
                'value': {'type': 'array', 'maxItems': 10, 'minItems':1}
            },
            'required': ['code', 'value'],
            'maxProperties': 2
        }
    },
    'required': ['email', 'username', 'password', 'callsign'],
    'maxProperties': 4
}
@api.route('/register', methods=['POST'])
@expects_json(schema)
def api_register():
    #abort if the user is already logged
    if current_user.is_authenticated:
        return error("unauthorized", details="you are already logged", code=400)
    #validate mail
    filtered_mail = parseaddr(g.data['email'])[1]
    if not '@' in filtered_mail:
        return error("invalid_email", code=400)
    #validate username
    if clearly_a_profanity(g.data['username']):
        return error("invalid_username", code=400)
    username = g.data['username']
    #validate callsign
    try:
        callsign_validation_data = validate_callsign(g.data['callsign'])
    except:
        return error("server_error", details="callsign verification failed", code=500)
    if not callsign_validation_data['valid']:
        return error("invalid_callsign", details=callsign_validation_data['details'])
    callsign = callsign_validation_data['callsign']

    #TODO: check for duplicates (mail, username, callsign)

    #prepare password
    password = g.data['password']
    ph = PasswordHasher()
    phash = ph.hash(password)
    #prepare other data
    timestamp = int(time.time())
    #insert the data
    with db_connection.Cursor() as cur:
        try:
            cur.execute("""INSERT INTO users
                    (email, username, password, callsign, registrationTimestamp, lastOnlineTimestamp)
                    VALUES ( ?, ?, ?, ?, ?, ?)""", (filtered_mail, username, phash, callsign, timestamp, timestamp) )
        except:
            return error("server_error", details="database query failed", code=500)
        userId = cur.lastrowid
    app.logger.info(userId)
    if not userId:
        #TODO: make this more explicit
        return error("server_error", details="insertion in database failed", code=500)
    #authenticate the user
    session['show_popup'] = False
    u = flask_login_base.get_user(userId)
    login_user(u, remember=False)
    return success(userId)

