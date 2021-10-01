from flask import Blueprint
from flask_login import login_required, current_user, login_user, logout_user
import os

from .. import flask_login_base
from .. import db_connection
from . import utils

api = Blueprint('api', __name__)

@api.route('/debug')
def debug():
    return os.environ['MARIADB_PASSWORD']
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
    return "[private] logout done"


@api.route('/', defaults={'path': ''})
@api.route('/<path:path>')
def api_page_not_found(path):
    return utils.error("api 404"), 404
