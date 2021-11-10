#basic imports
from . import api
from ._utils import success, error

from flask_login import login_required, current_user
from flask_expects_json import expects_json
from flask import g, session
from .. import db_connection
import mariadb 
import time
from .. import app
import json
import secrets
import hashlib

schema = {
    'type': 'object',
    'properties': {
        'schema': {'type': 'array', 'maxItems': 10, 'minItems':1},
        'expire': {'type': 'integer', 'minimum': 0},
        'max_uses': {'type': 'integer', 'minimum': 0, 'maximum': 1000},
        'description': {'type': 'string', 'maxLength':255, 'minLength':1 },
        'store_cleartext': {'type': 'boolean'}
    },
    'required': ['schema', 'expire', 'max_uses', 'description', 'store_cleartext'],
    'maxProperties': 5
}
@api.route('/generate_schema', methods=['POST'])
@login_required
@expects_json(schema)
def api_generate_schema():
    #validate expire timestamp
    if g.data['expire'] != 0 and g.data['expire'] < int(time.time()):
        return error("invalid_expire", details="expire timestamp provided is already expired")
    #TODO validate json schema
    #prepare json schema string
    json_schema_string = json.dumps(g.data['schema'])
    #generate cleartext code
    code_clear = "mrse_" + secrets.token_hex(8)
    #generate code sha512
    h = hashlib.sha1(code_clear.encode())
    code_hash = h.hexdigest()
    #attempt query creation
    with db_connection.Cursor() as cur:
        try:
            cur.execute("""INSERT INTO callsign_schemas
                    (`schema`, expire, max_uses, description, code_hash, code_clear)
                    VALUES ( ?, ?, ?, ?, ?, ?)""", (
                        json_schema_string,
                        g.data['expire'],
                        g.data['max_uses'],
                        g.data['description'],
                        code_hash,
                        code_clear
                        ) )
        except mariadb.Error as e:
            app.logger.error(f'error sql {e}')
            return error("server_error", details="database query failed", code=500)
        userId = cur.lastrowid
    app.logger.info(userId)


    return success("")
