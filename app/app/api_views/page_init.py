from flask import g, session
from flask_login import current_user
from .. import db_connection
from . import api
from .. import app
from ._utils import success, error
import secrets

# this api endpoint is called when a page in the frontend loads.
# it returns the essential data required by every page. 
# - In other systems, this data would be injected in the page before serving it.
# this method is also responsible for initializing the user session variables, when not set,
# and should be the only one that doesn't require authentication
@api.route('/pageInit', methods=['POST'])
def api_page_init():
    isFresh = False
    isLogged = current_user.is_authenticated
    if not session.get('csrf'):
        session['csrf'] = 'csrf_' + secrets.token_hex(16)
        isFresh = True
    app.logger.info(isLogged)
    data = {
            'logged': isLogged,
            'csrf': session['csrf'],
            'csrf_generated_fresh': isFresh
            }
    return success(data)
    #authenticated data
    # if current_user.is_authenticated:
    #     data = {
    #             'logged':True,
    #             'callsign': 'IT00ALB'
    #             }
    #     return success(data)
    #unauthenticated data
    # data = {
    #         'logged':False
    #         }
    # return success(data)

