from flask import Blueprint
from flask_login import login_required, current_user, login_user, logout_user

from .. import flask_login_base

api = Blueprint('api', __name__)

@api.route('/info')
def api_info():
    return "api public info"

@api.route('/user')
@login_required
def api_user():
    return "[private] api User info -<br> name:" + current_user.name

@api.route('/login')
def api_login():
    u = flask_login_base.get_user('3g')
    login_user(u, remember=True)
    return "logged in"

@api.route('/logout')
@login_required
def api_logout():
    logout_user()
    return "[private] logout done"


@api.route('/', defaults={'path': ''})
@api.route('/<path:path>')
def api_page_not_found(path):
    return "api 404 error", 404
