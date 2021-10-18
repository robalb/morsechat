#page specific imports
from flask import g, session
from flask_expects_json import expects_json
from email.utils import parseaddr
from argon2 import PasswordHasher
from flask_login import login_user
import time
from .. import db_connection
from .. import flask_login_base

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
    },
    'required': ['email', 'username', 'password'],
    'maxProperties': 3
}
@api.route('/register', methods=['POST'])
@expects_json(schema)
def api_register():
    #validate mail
    filtered_mail = parseaddr(g.data['email'])[1]
    if not '@' in filtered_mail:
        return error("invalid email"), 400
    #validate username
    if clearly_a_profanity(g.data['username']):
        return error("invalid username"), 400
    username = g.data['username']
    #prepare password
    password = g.data['password']
    ph = PasswordHasher()
    phash = ph.hash(password)
    #prepare other data
    timestamp = int(time.time())
    #insert the data
    conn = db_connection.get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""INSERT INTO users
                (email, username, password, callsign, registrationTimestamp, lastOnlineTimestamp)
                VALUES ( ?, ?, ?, ?, ?, ?)""", (filtered_mail, username, phash, "", timestamp, timestamp) )
    except:
        conn.close()
        return error("database error"), 500
    userId = cur.lastrowid
    conn.commit()
    conn.close()
    #authenticate the user
    session['show_popup'] = False
    u = flask_login_base.get_user(userId)
    login_user(u, remember=False)

    return success(userId)

