from flask import session, request
from flask_login import current_user
from . import api
from .. import app
from ._utils import success, generate_anonymous_callsign, negotiate_country, generate_anonymous_id
from ._procedures import Data_modules
import secrets


#the only endpoint that can be called without a csrf token. therefore the first endpoint that will
#be called when any frontend page loads, 
# Returns essential data required by all frontend pages
@api.route('/page_init', methods=['POST'])
def api_page_init():
    app.logger.info("RECEIVED")
    #initialize the csrf token
    if not 'csrf' in session:
        session['csrf'] = 'csrf_' + secrets.token_hex(16)

    #initialize the show_popup variable. When true client pages will show the login popup on load
    if not 'show_popup' in session:
        session['show_popup'] = True

    #initialize the user channel
    if not 'authorized_channel' in session:
        session['authorized_channel'] = None

    #if the user is not authenticated, generate random callsign, id, and get user country
    if not current_user.is_authenticated and 'anonymous_id' not in session:
        lang_header = ""
        if request.headers.get('Accept-Language'):
            lang_header = request.headers['Accept-Language']
        session['country'] = negotiate_country(lang_header)
        session['anonymous_callsign'] = generate_anonymous_callsign(session['country'])
        #logged users have an unique username. Anonymous users also need an uid
        session['anonymous_id'] = generate_anonymous_id()

    data_modules = Data_modules(current_user, session)
    data = {
            'session': data_modules.api_session(),
            'app': data_modules.app(),
            'user': data_modules.user()
            }
    return success(data)
