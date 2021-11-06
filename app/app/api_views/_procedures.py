from .. import db_connection
from .. import app
import time
import mariadb
import hashlib
import re
import json
from ._utils import get_country_names

def validate_callsign(callsign_data):
    """
    input: callsign data in the form
    {
     value: [
      string,
      string,
      ...
     ],
     code: "schema_code (cleartext, starting with mrse_ prefix)"
    }

    @return object in the form
    {
     valid: True|False,
     details: "err description"
    }

    """
    def validate(value, schema):
        """
            add here the server side validation logic for new modules
        """
        #country module
        if schema['module'] == 'country':
            if value not in get_country_names():
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
    #fetch the schema associated to the callsign code
    with db_connection.Cursor() as cur:
        try:
            cur.execute("""SELECT `schema`, `expire`, max_uses FROM callsign_schemas
                    WHERE code_hash = ?""", (code_hash,) )
        except mariadb.Error as e:
            app.logger.error(f'error sql {e}')
        row = cur.fetchone()
    #schema not found: invalid code
    if not row:
        return { 'valid': False, 'details': 'invalid code' }
    #expired code
    if row.expire != 0 and int(time.time()) <= row.expire:
        return { 'valid': False, 'details': 'expired code' }
    #extract json schema
    schema_objects = json.loads(row.schema)
    #validate every element in callsign_data.value, using the corresponding schema object
    for i, value in enumerate(callsign_data['value']):
        if not validate(value, schema_objects[i]):
            return { 'valid': False, 'details': 'callsign doesn\'t match the schema' }

    callsign = ''.join(callsign_data['value'])
    return { 'valid': True, 'callsign': callsign}
