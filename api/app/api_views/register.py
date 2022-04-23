#page specific imports
import mariadb 
from flask import g, session
from flask_expects_json import expects_json
from argon2 import PasswordHasher
from flask_login import login_user, current_user
import time
from .. import db_connection
from .. import flask_login_base
from .. import app
from ._procedures import validate_callsign, Data_modules

#basic imports
from . import api
from ._utils import success, error, clearly_a_profanity

schema = {
    'type': 'object',
    'properties': {
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
    'required': ['username', 'password', 'callsign'],
    'maxProperties': 3
}
@api.route('/register', methods=['POST'])
@expects_json(schema)
def api_register():
    #abort if the user is already logged
    if current_user.is_authenticated:
        return error("unauthorized", details="you are already logged", code=400)
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
    callsign_schemaid = callsign_validation_data['schemaid']

    #check if the callsign is in use
    with db_connection.Cursor() as cur:
        try:
            cur.execute("""SELECT `ID` FROM users WHERE callsign = ? LIMIT 1 """, (callsign,) )
        except:
            return error("server_error", details="database query 0 failed", code=500)
        row = cur.fetchone()
        if row:
            return error("callsign_exist")

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
                    (username, password, callsign, registration_timestamp, last_online_timestamp, callsign_schema)
                    VALUES ( ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `ID`=`ID`""", (username, phash, callsign, timestamp, timestamp, callsign_schemaid) )
        except mariadb.Error as e:
            app.logger.error(f'apiregistration error sql {e}')
            return error("server_error", details="database query 1 failed", code=500)
        userId = cur.lastrowid
    app.logger.info(userId)
    if not userId:
        # return error("server_error", details="insertion in database failed", code=500)
        return error("username_exist")
    #authenticate the user
    session['show_popup'] = False
    u = flask_login_base.get_user(userId)
    login_user(u, remember=False)

    #prepare critical data that the user must update
    data_modules = Data_modules(current_user, session)
    data = {
            'session': data_modules.api_session(),
            'user': data_modules.user()
            }
    return success(data)

