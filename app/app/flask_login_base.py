import mariadb 
from . import db_connection
from . import app

class User:
    authenticated = False
    def __init__(this, namedTuple):
        this.id = namedTuple.ID
        this.email = namedTuple.email
        this.callsign = namedTuple.callsign
        this.lastOnline = namedTuple.lastOnlineTimestamp
    def is_active(self):
        return True

    def get_id(self):
        return self.id

    def is_authenticated(self):
        return self.authenticated

    def is_anonymous(self):
        return False

def get_user(user_id):
    app.logger.info('This is info output')
    conn = db_connection.get_conn()
    cur = conn.cursor(named_tuple=True)
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

