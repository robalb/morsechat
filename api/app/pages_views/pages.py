from app import app, pusher
from flask_login import login_user, logout_user, login_required, current_user

@pusher.auth
def pusher_auth(channel_name, socket_id):
  """Pusher authentication endpoint
  By default this endpoint is accessed at /pusher/auth
  """
  #if 'foo' in channel_name:
  #    # refuse foo channels
  #    return False
  # authorize only authenticated users
  return current_user.is_authenticated()

@pusher.channel_data
def pusher_channel_data(channel_name, socket_id):
    return {
        "name": current_user.callsign
    }
