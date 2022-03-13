from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_session import Session
import logging
import os
from . import db_connection
from flask_pusher import Pusher

development_mode = os.environ['FLASK_ENV'] == 'development'

# create application instance
app = Flask(__name__, static_folder="../static")

logging.basicConfig(level=logging.DEBUG)
app.config['SESSION_TYPE'] = 'sqlalchemy'
app.config['SESSION_COOKIE_NAME'] = 'PHPSESSID'
config = db_connection.config
app.config['SQLALCHEMY_DATABASE_URI'] = f"mariadb+mariadbconnector://{config['user']}:{config['password']}@{config['host']}:{config['port']}/{config['database']}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # quiet warning message, deprecated but required

alchemy = SQLAlchemy(app)
app.config['SESSION_SQLALCHEMY'] = alchemy
server_session = Session(app)

#TODO: find out if this is bad
server_session.app.session_interface.db.create_all()
login_manager = LoginManager()
login_manager.init_app(app)

#pusher credentials configuration
app.config['PUSHER_APP_ID'] = 'PUSHER_APP_ID'
app.config['PUSHER_KEY'] = 'PUSHER_KEY'
app.config['PUSHER_SECRET'] = 'PUSHER_SECRET'
#pusher server location configuration
if 'PUSHER_HOST' in os.environ:
  app.config['PUSHER_HOST'] = 'PUSHER_HOST'
  app.config['PUSHER_PORT'] = 'PUSHER_PORT'
else:
  app.config['PUSHER_CLUSTER'] = 'PUSHER_CLUSTER'

pusher = Pusher(app, ssl=False)

# import generic page views
# note: in production, only uris starting with /api/v1/ should be forwarded to flask.
# these pages views are not important
#from .pages_views import pages

# initialize blueprint
from .api_views import api
app.register_blueprint(api, url_prefix='/api/v1/')


#TODO implement, and move to dedicated file
# @pusher.auth
# def pusher_auth(channel_name, socket_id):
#     if 'foo' in channel_name:
#         # refuse foo channels
#         return False
#     # authorize only authenticated users
#     return current_user.is_authenticated()

