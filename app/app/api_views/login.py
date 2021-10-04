#page specific imports
from flask import g
from flask_expects_json import expects_json
from argon2 import PasswordHasher
from flask_login import login_user, logout_user, login_required
from .. import db_connection
from .. import flask_login_base
from .. import app

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
@api.route('/login', methods=['POST'])
@expects_json(schema)
def api_login():
    #abort if the user is already logged
    if current_user.is_authenticated():
        return error("already_logged"), 400
    ph = PasswordHasher()
    conn = db_connection.get_conn()
    cur = conn.cursor(named_tuple=True)
    try:
        cur.execute("SELECT ID, password FROM users WHERE email = ?", (g.data['email'],))
    except:
        return error("database error"), 500
    row = cur.fetchone()
    credentials_are_good = False
    #if the mail exist
    if row:
        #check that the password is good
        app.logger.info("mail is good")
        app.logger.info(row)
        app.logger.info(f"{g.data['password']}")
        try:
            if ph.verify(row.password, g.data['password']):
                app.logger.info("pass is good")
                credentials_are_good = True
        except:
            pass
    #authenticate the user
    if credentials_are_good:
        u = flask_login_base.get_user(row.ID)
        login_user(u, remember=False)
        return success("")
    else:
        return error("invalid_credentials")


@api.route('/logout')
@login_required
def api_logout():
    logout_user()
    return success("")

