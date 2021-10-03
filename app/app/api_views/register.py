#page specific imports
from flask import g
from flask_expects_json import expects_json
from email.utils import parseaddr
from argon2 import PasswordHasher
from flask_login import login_user
import time
from .. import db_connection
from .. import flask_login_base

#basic imports
from . import api
from ._utils import success, error

schema = {
    'type': 'object',
    'properties': {
        'email': {'type': 'string', 'maxLength':255, 'minLength':1 },
        'password': {'type': 'string', 'maxLength':255, 'minLength':8 },
    },
    'required': ['email', 'password'],
    'maxProperties': 2
}
@api.route('/register', methods=['POST'])
@expects_json(schema)
def api_register():
    #prepare and validate data to insert
    filtered_mail = parseaddr(g.data['email'])[1]
    if not '@' in filtered_mail:
        return error("invalid email"), 400
    password = g.data['password']
    ph = PasswordHasher()
    phash = ph.hash(password)
    timestamp = int(time.time())
    #insert the data
    conn = db_connection.get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""INSERT INTO users
                (email, password, callsign, registrationTimestamp, lastOnlineTimestamp)
                VALUES ( ?, ?, ?, ?, ?)""", (filtered_mail, phash, "", timestamp, timestamp) )
    except:
        return error("database error"), 500
    userId = cur.lastrowid
    conn.commit()
    conn.close()
    #authenticate the user
    u = flask_login_base.get_user(userId)
    login_user(u, remember=False)

    return success(userId)

