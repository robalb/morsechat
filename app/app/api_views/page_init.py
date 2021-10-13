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
    #initialize if not set the anti-csrf token
    if not session.get('csrf'):
        session['csrf'] = 'csrf_' + secrets.token_hex(16)
        isFresh = True
    #initialize if not set the variable used to know if the user has choosen to stay
    #anonymous
    if not session.get('wants_anonymous'):
        session['wants_anonymous'] = False
    data = {
            'authenticated': current_user.is_authenticated,
            'anonymous': current_user.is_anonymous,
            'wants_anonymous': session['wants_anonymous'],
            'csrf': session['csrf'],
            'csrf_generated_fresh': isFresh,
            'user': {

                }
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

