from flask import Blueprint, request, session
import secrets
import os

from .. import flask_login_base
from .. import app
from .. import login_manager
from ._utils import success, error

#configure login manager
@login_manager.user_loader
def user_loader(user_id):
    return flask_login_base.get_user(user_id)
@login_manager.unauthorized_handler
def unauthorized():
    return error("unauthorized", details="you are not logged in", code=401)


#initialize the api blueprint
api = Blueprint('api', __name__)

development_mode = os.environ['FLASK_ENV'] == 'development'

#this function will run after every request, setting the appropriate cors headers
#if the app is in development mode
@api.after_request
def after_request(response):
    if development_mode:
        header = response.headers
        header['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        header['Access-Control-Allow-Credentials'] = 'true'
        header['Access-Control-Allow-Headers'] = 'X-Csrf-Magic, Content-Type'
    return response


# this function will run before every request, and will return an error if:
# -it doesn't contain a valid anti-csrf header
# -it contains invalid sec-fetch headers
@api.before_request
def before_request_func():
    reject = False
    #endpoints that don't require csrf tokens
    no_csrf_views = [
      "api.api_page_init",
      "api.api_page_not_found",
      "api.api_nat_test",
      "api.api_public_stats"
    ]
    if request.endpoint in no_csrf_views or (
            #allow cors preflight requests in development mode
            development_mode and
            request.method == "OPTIONS" and 
            "Access-Control-Request-Method" in request.headers
            ):
        app.logger.info("skipping csrf token checks")
    else:
        if not request.headers.get("X-Csrf-Magic"):
            app.logger.error("rejected for missing csrf header")
            reject = True
        elif not session.get('csrf'):
            app.logger.error("rejected for missing csrf in session")
            reject = True
        elif not secrets.compare_digest(request.headers["X-Csrf-Magic"], session["csrf"]):
            app.logger.error("rejected for wrong csrf")
            reject = True
    #reject for csrf errors
    if reject:
        return error("unauthorized", details="csrf_token_error", code=401)

    # https://web.dev/fetch-metadata/
    # https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-Fetch-Dest
    if request.headers.get("Sec-Fetch-Site") and not development_mode:
        if request.headers['Sec-Fetch-Site'] not in ('same-site','same-origin'):
            app.logger.error("rejected for wrong sec-fetch-site")
            app.logger.info(request.headers.get("Sec-Fetch-Site"))
            reject = True
    if request.headers.get("Sec-Fetch-Dest"):
        if request.headers['Sec-Fetch-Dest'] not in ('empty',):
            app.logger.error("rejected for wrong sec-fetch-Dest")
            app.logger.info(request.headers.get("Sec-Fetch-Dest"))
            reject = True
    #reject for sec-fetch errors
    if reject:
        return error("unauthorized", details="request_origin_error", code=401)


from . import register
from . import login
from . import validate_callsign
from . import redeem
from . import generate_schema
from . import page_init
from . import pusher_auth
from . import update_settings
from . import message
from . import nat_test
from . import public_stats

from . import errors
