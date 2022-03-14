from app import app, pusher
from flask_login import login_required, current_user
from flask import g, session, request

#TODO: remove completely, after the flask-pusher library is removed
#      I'm keeping this to avoid weird vulnerabilities
@pusher.auth
def pusher_auth(channel_name, socket_id):
  """Pusher authentication endpoint
  By default this endpoint is accessed at /pusher/auth
  """
  #if 'foo' in channel_name:
  #    # refuse foo channels
  #    return False
  # authorize only authenticated users
  #return current_user.is_authenticated()
  return False

#WARNING this is always accepting users
@app.route("/pusher_auth", methods=['POST'])
def pusher_authentication():
    if current_user.is_authenticated:
        #TODO: authenticated users check
        pass
    elif 'anonymous_callsign' in session:
        #TODO anonymous users check
        pass
    else:
        return "pusher_auth_denied", 403

    #TODO:
    #put here shadow ban logic

    # pusher_client is obtained through pusher_client = pusher.Pusher( ... )
    auth = pusher.client.authenticate(
            channel=request.form['channel_name'],
            socket_id=request.form['socket_id'],
            custom_data={
                u'user_id': u'1',
                u'user_info': {
                    u'twitter':
                    u'@pusher'
                    }
                }
            )
    return auth
