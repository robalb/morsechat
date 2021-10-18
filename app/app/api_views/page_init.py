from flask import g, session, request
from flask_login import current_user
from .. import db_connection
from . import api
from .. import app
from ._utils import success, error, generate_anonymous_callsign
import secrets

# this api endpoint is called when a page in the frontend loads.
# it returns the essential data required by every page. 
# - In other systems, this data would be injected in the page before serving it.
# this method is also responsible for initializing the user session variables, when not set
@api.route('/page_init', methods=['POST'])
def api_page_init():
    #initialize if not set the anti-csrf token
    if not session.get('csrf'):
        session['csrf'] = 'csrf_' + secrets.token_hex(16)
    #initialize if not set the show_popup variable. When true client pages will show
    # the login popup on load
    if not 'show_popup' in session:
        app.logger.info("setting to false")
        session['show_popup'] = True
    #generate random callsign if the user is not authenticated, and if not already set
    #this will be regenerated if the user joins a room where someone has the same callsign
    if not current_user.is_authenticated and not session.get('anonymous_callsign'):
        lang_header = ""
        if request.headers.get('Accept-Language'):
            lang_header = request.headers['Accept-Language']
        session['anonymous_callsign'] = generate_anonymous_callsign(lang_header)
    #prepare return data
    if current_user.is_authenticated:
        user_data = {
                'id': current_user.id,
                'email': current_user.email,
                'username': current_user.username,
                'callsign': current_user.callsign,
                'last_online': current_user.last_online
                }
    else:
        user_data = {
                'callsign': session['anonymous_callsign']
                }
    data = {
            'session': {
                'authenticated': current_user.is_authenticated,
                'show_popup': session['show_popup'],
                'csrf': session['csrf']
                },
            'app': {
                #TODO use real data, from some config file
                'rooms': {
                    'chat': 3,
                    'radio': 3
                    }
                },
            'user': user_data
            }
    return success(data)



@api.route('/test', methods=['POST'])
def api_test_2():
    app.logger.info("---- body")
    return "test"
