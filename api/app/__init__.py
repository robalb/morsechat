from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_session import Session
import logging
import os
from . import db_connection
import pusher

development_mode = os.environ['FLASK_ENV'] == 'development'

# create application instance
app = Flask(__name__, static_folder="../static")

#App specific configuration
#ratelimit: minimum seconds between each message sent.
app.config['MESSAGE_COOLDOWN'] = 10
#this multpiplier will be applied to MESSAGE_COOLDOWN if the user is suspicious
#Suspicious behaviour include having a wpm > 30
app.config['SUSPICIOUS_MULPTIPLIER'] = 2
app.config['MAX_MESSAGE_DURATION'] = 60 # 60 seconds

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
app.config['PUSHER_APP_ID'] = os.environ['PUSHER_APP_ID']
app.config['PUSHER_KEY'] = os.environ['PUSHER_KEY']
app.config['PUSHER_CLUSTER'] = os.environ['PUSHER_CLUSTER']
app.config['PUSHER_SECRET'] = os.environ['PUSHER_SECRET']
app.config['PUSHER_SSL'] = False
#pusher server location configuration
if 'PUSHER_HOST' in os.environ and 'PUSHER_PORT' in os.environ:
  app.config['PUSHER_HOST'] = os.environ['PUSHER_HOST']
  app.config['PUSHER_PORT'] = int(os.environ['PUSHER_PORT'])
#This has precedence over PUSHER_HOST in the web client
if 'PUSHER_HOST_WEB' in os.environ:
  app.config['PUSHER_HOST_WEB'] = os.environ['PUSHER_HOST_WEB']

pusher = pusher.Pusher(
    app_id=app.config['PUSHER_APP_ID'],
    key=app.config['PUSHER_KEY'],
    secret=app.config['PUSHER_SECRET'],
    cluster=app.config['PUSHER_CLUSTER'],
    host=app.config['PUSHER_HOST'],
    port=app.config['PUSHER_PORT'],
    ssl=False
)

# initialize the api blueprint
from .api_views import api
app.register_blueprint(api, url_prefix='/api/v1/')

