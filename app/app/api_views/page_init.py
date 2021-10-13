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
# this method is also responsible for initializing the user session variables, when not set
@api.route('/page_init', methods=['POST'])
def api_page_init():
    isFresh = False
    #initialize if not set the anti-csrf token
    if not session.get('csrf'):
        session['csrf'] = 'csrf_' + secrets.token_hex(16)
        isFresh = True
    #initialize if not set the variable indicating that the user has choosen to stay anonymous
    if not session.get('app_anonymous'):
        session['app_anonymous'] = False
    #prepare return data
    user_data = {}
    if current_user.is_authenticated:
        user_data = {
                'id': current_user.id,
                'email': current_user.email,
                'username': current_user.username,
                'callsign': current_user.callsign,
                'last_online': current_user.last_online
                }
    data = {
            'session': {
                'authenticated': current_user.is_authenticated,
                'anonymous': session['app_anonymous'],
                'csrf': session['csrf'],
                'csrf_generated_fresh': isFresh,
                },
            'app': {
                'rooms': {
                    'chat': 3,
                    'radio': 3
                    }
                },
            'user': user_data
            }
    return success(data)

