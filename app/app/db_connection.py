import os
import mariadb
import flask

# configuration used to connect to MariaDB
config = {
    'host': os.environ['MARIADB_HOST'],
    'port': 3306,
    'user': os.environ['MARIADB_USER'],
    'password': os.environ['MARIADB_PASSWORD'],
    'database': os.environ['MARIADB_DATABASE']
}

# https://stackoverflow.com/questions/16311974/connect-to-a-database-in-flask-which-approach-is-better
def get_conn():
    return mariadb.connect(**config)

"""
cur = conn.cursor() 
conn.commit() 
conn.close()
"""
