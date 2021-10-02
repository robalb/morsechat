from flask import Blueprint, g
from flask_login import login_required, current_user, login_user, logout_user
from flask_expects_json import expects_json
from jsonschema import ValidationError

from .. import flask_login_base
from .. import db_connection
from .. import login_manager
from .utils import success, error

#configure login manager
@login_manager.user_loader
def user_loader(user_id):
    return flask_login_base.get_user(user_id)
@login_manager.unauthorized_handler
def unauthorized():
    return error("unauthorized", detail="you are not logged in"), 401

#initialize the api blueprint
api = Blueprint('api', __name__)

#############################
@api.route('/debug')
def debug():
    return "DEBUG"

#############################
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
    return g.data

@api.route('/info')
def api_info():
    conn = db_connection.get_conn()
    cur = conn.cursor()
    cur.execute("SELECT callsign,description FROM special_callsigns LIMIT 1")
    out = ""
    for callsign, description in cur:
        out += f"callsign: {callsign} description: {description}"
    #conn.commit()
    conn.close()
    return "api public info - <br>" + out

@api.route('/user')
@login_required
def api_user():
    return "[private] api User info -<br> name:" + current_user.name

@api.route('/login')
def api_login():
    u = flask_login_base.get_user('3g')
    login_user(u, remember=False)
    return "logged in"

@api.route('/logout')
@login_required
def api_logout():
    logout_user()
    return success("")


#handle 404s in a custom way
@api.route('/', defaults={'path': ''})
@api.route('/<path:path>')
def api_page_not_found(path):
    return error(404, detail="api endpoint not found"), 404


#handle 400 errors, mostly issued by flask-expect-json
@api.app_errorhandler(400)
def bad_request(err):
    if isinstance(err.description, ValidationError):
        original_error = err.description
        return error(original_error.message), 400
    # handle other "Bad Request"-errors
    return err

