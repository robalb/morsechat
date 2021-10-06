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
    return error("unauthorized", detail="you are not logged in"), 401


#initialize the api blueprint
api = Blueprint('api', __name__)

#TODO
#define before request for api blueprint
#that handles csrf tokens (by checking a custom header, and by using sessions)
#and also handles SEC_FETCH headers
#https://pythonise.com/series/learning-flask/python-before-after-request

#https://stackoverflow.com/questions/34164464/flask-decorate-every-route-at-once

from . import register
from . import login

from . import errors
