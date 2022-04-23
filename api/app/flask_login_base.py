import mariadb 
from . import db_connection
from . import app

class User:
    def __init__(this, namedTuple):
        this.id = namedTuple.ID
        this.username = namedTuple.username
        this.callsign = namedTuple.callsign
        this.last_online = namedTuple.last_online_timestamp
        this.settings = namedTuple.settings
        this.verified = namedTuple.verified
        this.banned = namedTuple.banned

        #required properties
        this.is_authenticated = True
        this.is_active = True
        this.is_anonymous = False

    def get_id(self):
        return self.id

def get_user(user_id):
    app.logger.info('flask_login called get_user')
    with db_connection.Cursor() as cur:
        try:
            cur.execute("SELECT * FROM users WHERE `ID` = %d ", (user_id,))
        except mariadb.Error as e:
            app.logger.info(f'error sql {e}')
            return None
        row = cur.fetchone()
    if not row:
        return None
    user = User(row)
    return user

