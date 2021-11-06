from .. import db_connection
from .. import app
import time
import mariadb
import hashlib
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

    @TODO: decide if it's useful to implement max uses (requires logging data, updating this table after successful code use)
    """
    app.logger.info("STARTING callsign validation")
    app.logger.info(callsign_data)
    app.logger.info(get_country_names())

    def validate(value, schema):
        """
            add here the server side validation logic for new modules
        """
        app.logger.info("----- validatin module: ")
        app.logger.info(schema)
        #country module
        if schema['module'] == 'country':
            if value not in get_country_names():
                return False
        #text module
        # else if schema['module'] == 'text':
        #     pass
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

    return { 'valid': True, 'callsign': 'asdasd' }
