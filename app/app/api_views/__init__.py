from flask import Blueprint

from .. import flask_login_base
from .. import login_manager
from ._utils import success, error

#configure login manager
@login_manager.user_loader
def user_loader(user_id):
    return flask_login_base.get_user(user_id)
@login_manager.unauthorized_handler
def unauthorized():
    return error("unauthorized", details="you are not logged in"), 401


#initialize the api blueprint
api = Blueprint('api', __name__)

#TODO: this must be set only in development
@api.after_request # blueprint can also be app~~
def after_request(response):
    header = response.headers
    header['Access-Control-Allow-Origin'] = 'http://localhost:8000'
    header['Access-Control-Allow-Credentials'] = 'true'
    header['Access-Control-Allow-Headers'] = 'X-Csrf-Magic, Content-Type'
    return response

#TODO
#define before request for api blueprint
#that handles csrf tokens (by checking a custom header, and by using sessions)
#and also handles SEC_FETCH headers
#https://pythonise.com/series/learning-flask/python-before-after-request

#https://stackoverflow.com/questions/34164464/flask-decorate-every-route-at-once

from . import register
from . import login

from . import errors
from . import page_init
