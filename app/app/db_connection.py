import os
import mariadb
import flask

# configuration used to connect to MariaDB and sqlalchemy
config = {
    'host': os.environ['MARIADB_HOST'],
    'port': 3306,
    'user': os.environ['MARIADB_USER'],
    'password': os.environ['MARIADB_PASSWORD'],
    'database': os.environ['MARIADB_DATABASE']
}

# https://stackoverflow.com/questions/16311974/connect-to-a-database-in-flask-which-approach-is-better
#TODO: need connection pooling.
#since we are using sqlalchemy, that seems to use connection pooling, maybe
#the best option is to borrow sqlalchemy's cursor
def get_conn():
    return mariadb.connect(**config)

# https://stackoverflow.com/questions/5669878/when-to-close-cursors-using-mysqldb/22618781#22618781
class Cursor:
    def __enter__(this):
        this.conn = get_conn()
        this.cur = this.conn.cursor(named_tuple=True)
        return this.cur

    def __exit__(this, exc, value, tb):
        #put here commit logic based on exc error
        #autocommit should be enabled by default
        this.cur.close()
        this.conn.close()



"""
cur = conn.cursor() 
conn.commit() 
conn.close()
"""
