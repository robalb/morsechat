#page specific imports
from flask import g, session
from flask_expects_json import expects_json
from argon2 import PasswordHasher
from flask_login import login_user, logout_user, login_required, current_user
from ._procedures import Data_modules
from .. import db_connection
from .. import flask_login_base
from .. import app

#basic imports
from . import api
from ._utils import success, error

schema = {
    'type': 'object',
    'properties': {
        'username': {'type': 'string', 'maxLength':20, 'minLength':1 },
        'password': {'type': 'string', 'maxLength':255, 'minLength':8 },
    },
    'required': ['username', 'password'],
    'maxProperties': 2
}
@api.route('/login', methods=['POST'])
@expects_json(schema)
def api_login():
    #abort if the user is already logged
    if current_user.is_authenticated:
        return error("unauthorized", details="you are already logged", code=400)
    ph = PasswordHasher()
    with db_connection.Cursor() as cur:
        try:
            cur.execute("SELECT ID, password FROM users WHERE username = ?", (g.data['username'],))
        except:
            return error("server_error", details="database query failed", code=500)
        row = cur.fetchone()
    credentials_are_good = False
    #if the username exist
    if row:
        #check that the password is good
        try:
            if ph.verify(row.password, g.data['password']):
                credentials_are_good = True
        except:
            pass
    #authenticate the user
    if credentials_are_good:
        u = flask_login_base.get_user(row.ID)
        session['show_popup'] = False
        login_user(u, remember=False)

        #prepare critical data that the user must update
        data_modules = Data_modules(current_user, session)
        data = {
                'session': data_modules.api_session(),
                'user': data_modules.user()
                }
        return success(data)
    else:
        return error("invalid_credentials", code=400)


# set the session popup flag to False.
# when this flag is false, the frontend pages won't show
# the login popup on load
@api.route('/no_popup', methods=['POST'])
def api_no_popup():
    session['show_popup'] = False
    return success("")

#logs out authenticated users.
#anonymous users don't have this option, they can only
#login or register an account
@api.route('/logout', methods=['POST'])
@login_required
def api_logout():
    logout_user()

    #prepare critical data that the user must update
    data_modules = Data_modules(current_user, session)
    data = {
            'session': data_modules.api_session(),
            'user': data_modules.user()
            }
    return success(data)


