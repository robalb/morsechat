from flask import Flask
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_session import Session
import logging
import os
from . import db_connection

development_mode = os.environ['FLASK_ENV'] == 'development'

# create application instance
app = Flask(__name__, static_folder="../static")

logging.basicConfig(level=logging.DEBUG)
app.config['SESSION_TYPE'] = 'sqlalchemy'
app.config['SESSION_COOKIE_NAME'] = 'PHPSESSID'
config = db_connection.config
app.config['SQLALCHEMY_DATABASE_URI'] = f"mariadb+mariadbconnector://{config['user']}:{config['password']}@{config['host']}:{config['port']}/{config['database']}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # quiet warning message, deprecated but required


# initializes extensions
if development_mode:
  cors_options = '*'
else:
  cors_options = ''
socketio = SocketIO(app,
        # Tells socketIO to use flask internal sessions instead
        # of its own implementation. this is fine because we are using the
        # flask-session extension that doesn't rely on cookies
        manage_sessions=True,
        cors_allowed_origins=cors_options
        )
alchemy = SQLAlchemy(app)
app.config['SESSION_SQLALCHEMY'] = alchemy
server_session = Session(app)
#TODO: find out if this is bad
server_session.app.session_interface.db.create_all()
login_manager = LoginManager()
login_manager.init_app(app)

# import views
from .pages_views import pages
from .socket_events import events

# initialize blueprint
from .api_views import api
app.register_blueprint(api, url_prefix='/api/v1/')

