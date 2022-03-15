from .. import db_connection
from .. import app
import time
import mariadb
import hashlib
import re
import json
from ._utils import get_country_codes

def validate_callsign(callsign_data):
    """
    Takes in input the callsign data object usually returned from the frontend,
    and checks if it's in a valid format, by comparing the schema stored in the database
    with the callsign string.

    Parameters
    ----------
    callsign_data: dictionary {'value':list of str, 'code': str}
        The callsign data to validate

    Returns
    -------
    dictionary {'valid':bool 'details':str 'callsign':str }
    """
    def validate(value, schema):
        """
        validates a single module by checking if value matches the schema

        Notes
        -----
        add here the server side validation logic for new modules
        """
        #country module
        if schema['module'] == 'country':
            if value not in get_country_codes():
                app.logger.error("callsign validation: invalid country: " + value)
                return False
        #text module
        elif schema['module'] == 'text':
            if 'len' in schema and len(value) != schema['len']:
                app.logger.error("callsign validation: invalid text len: " + value)
                return False
            if 'ecmaPattern' in schema:
                pattern = re.compile(schema['ecmaPattern'])
                if not pattern.match(value):
                    app.logger.error("callsign validation: invalid text pattern: " + value)
                    return False
        #unknown module
        else:
            return False
        return True

    #prepare hash of cleartext code
    h = hashlib.sha1(callsign_data['code'].encode())
    code_hash = h.hexdigest()

    #fetch the schema associated to the cleartext hash
    with db_connection.Cursor() as cur:
        try:
            cur.execute("""SELECT `schema`, `expire`, max_uses FROM callsign_schemas
                    WHERE code_hash = ?""", (code_hash,) )
        except mariadb.Error as e:
            app.logger.error(f'error sql {e}')
        row = cur.fetchone()
    if not row:
        return { 'valid': False, 'details': 'invalid code' }
    if row.expire != 0 and int(time.time()) <= row.expire:
        return { 'valid': False, 'details': 'expired code' }

    #load the json fetched from the db
    schema_objects = json.loads(row.schema)

    #validate every element in callsign_data.value, using the corresponding schema object
    for i, value in enumerate(callsign_data['value']):
        if not validate(value, schema_objects[i]):
            return { 'valid': False, 'details': 'callsign doesn\'t match the schema' }

    callsign = ''.join(callsign_data['value'])
    return { 'valid': True, 'callsign': callsign}

class Data_modules:
    """
    Defines individual modules that return critical data used by the frontend,
    and stored in the main state of frontend apps
    Each module returns a dict of data that will be stored in a dedicated section in
    the frontend

    """
    def __init__(this, current_user, session):
        this.current_user = current_user
        this.session = session

    def user(this):
        if this.current_user.is_authenticated:
            user_data = {
                    'id': this.current_user.id,
                    'username': this.current_user.username,
                    'last_online': this.current_user.last_online,
                    'callsign': this.current_user.callsign,
                    'country': this.session['country'],
                    'settings': None
                    }
        else:
            user_data = {
                    'callsign': this.session['anonymous_callsign'],
                    'country': this.session['country'],
                    'settings': None
                    }
        return user_data

    def user_session(this):
        ret = {
            'authenticated': this.current_user.is_authenticated,
            'show_popup': this.session['show_popup'],
            'csrf': this.session['csrf']
        }
        return ret

    def app(this):
        pusher_key = app.config['PUSHER_KEY']
        pusher_cluster = app.config['PUSHER_CLUSTER']
        pusher_host = None
        pusher_port = None
        if 'PUSHER_HOST' in app.config and 'PUSHER_PORT' in app.config:
            pusher_host = app.config['PUSHER_HOST']
            pusher_port = app.config['PUSHER_PORT']
        ret = {
                'pusher_key': pusher_key,
                'pusher_cluster': pusher_cluster,
                'pusher_host': pusher_host,
                'pusher_port': pusher_port,
                'rooms': {
                    'chat': 3,
                    'radio': 3
                    }
                }
        return ret
