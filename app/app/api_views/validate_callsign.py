#page specific imports
from flask import g, session
from flask_expects_json import expects_json
from .. import db_connection

#basic imports
from . import api
from ._utils import success, error

schema = {
    'type': 'object',
    'properties': {
        'callsign': {'type': 'string', 'maxLength':20, 'minLength':1 },
    },
    'required': ['callsign'],
    'maxProperties': 1
}
@api.route('/validate_callsign', methods=['POST'])
@expects_json(schema)
def api_validate_callsign():
    conn = db_connection.get_conn()
    cur = conn.cursor(named_tuple=True)
    try:
        cur.execute("SELECT ID FROM users WHERE callsign = ?", (g.data['callsign'],))
        # conn.close()
    except:
        return error("server_error", details="database query failed", code=500)
    row = cur.fetchone()
    if row:
        return error("already_taken")
    return success("")


