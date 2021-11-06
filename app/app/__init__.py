from flask import Flask
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_session import Session
import logging
from . import db_connection

# create application instance
app = Flask(__name__, static_folder="../static")
logging.basicConfig(level=logging.DEBUG)
# app.config['SECRET_KEY'] = 'vnkdjnfjknfl1232#'
app.config['SESSION_TYPE'] = 'sqlalchemy'
app.config['SESSION_COOKIE_NAME'] = 'PHPSESSID'
config = db_connection.config
app.config['SQLALCHEMY_DATABASE_URI'] = f"mariadb+mariadbconnector://{config['user']}:{config['password']}@{config['host']}:{config['port']}/{config['database']}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # quiet warning message, deprecated but required

# initializes extensions
socketio = SocketIO(app,
        manage_sessions=True, #manage_sessions=True tells socketIO to use flask internal sessions instead of its own implementation. this is fine because we are using the flask-session extension that doesn't rely on cookies
        cors_allowed_origins='http://localhost:8000' #TODO: this must be set only in development
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
# from . import api_views
# from . import socket_views

# initialize blueprint
# WARNING: in the example here https://github.com/miguelgrinberg/Flask-SocketIO-Chat/blob/master/app/main/__init__.py
#          the blueprit is registered before the socketIO binding to app. could be important
from .api_views import api
app.register_blueprint(api, url_prefix='/api/v1/')

