#page specific imports
from flask import g, session
from flask_expects_json import expects_json
from argon2 import PasswordHasher
from flask_login import login_user, logout_user, login_required, current_user
from ._procedures import Data_modules
from .. import db_connection
from .. import flask_login_base
from .. import app

#basic imports
from . import api
from ._utils import success, error

schema = {
    'type': 'object',
    'properties': {
        'dialect': {'type': 'string', 'maxLength':20, 'minLength':1 },
        'key_mode': {'type': 'string', 'maxLength':20, 'minLength':1 },
        'wpm': {'type': 'integer', 'minimum':0, 'maximum':100 },
        'volume_receiver': {'type': 'integer', 'minimum':0, 'maximum':100 },
        'volume_key': {'type': 'integer', 'minimum':0, 'maximum':100 },
        'submit_delay': {'type': 'integer', 'minimum':0, 'maximum':100 },
        'show_readable': {'type': 'boolean'},
        'keybinds': {
            'type': 'object',
            'properties': {
                'straight': {'type': 'string', 'maxLength':2, 'minLength':1 },
                'yambic_dot': {'type': 'string', 'maxLength':2, 'minLength':1 },
                'yambic_dash': {'type': 'string', 'maxLength':2, 'minLength':1 },
                'cancel_message': {'type': 'string', 'maxLength':2, 'minLength':1 }
            },
            'required': ['straight', 'yambic_dot', 'yambic_dash', 'cancel_message']
        }
    },
    'required': ['dialect', 'key_mode', 'wpm', 'volume_receiver', 'volume_key', 'submit_delay', 'show_readable', 'keybinds' ],
}
@api.route('/update_settings', methods=['POST'])
@login_required
@expects_json(schema)
def api_update_settings():
    return success("")