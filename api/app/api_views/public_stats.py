#basic imports
from . import api
from ._utils import success, error
from flask import request
from app import pusher

@api.route('/public_stats', methods=['POST', 'GET'])
def api_public_stats():
  """
  Public statistics about the connected users.
  This endpoint is useful for status badges on github or discord servers.
  """
  info = pusher.channels_info("presence-", ['user_count'])
  channels = info['channels']
  active_channels = 0
  online_users = 0
  for channel in channels:
    active_channels += 1
    online_users += channels[channel]['user_count']

  return {"online_users": online_users, "active_channels":active_channels}
