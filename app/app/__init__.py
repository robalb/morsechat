from flask import Flask
from flask_socketio import SocketIO
from flask_login import LoginManager
from flask_session import Session
import logging

# create application instance
app = Flask(__name__, static_folder="../static")
logging.basicConfig(level=logging.DEBUG)
# app.config['SECRET_KEY'] = 'vnkdjnfjknfl1232#'
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_COOKIE_NAME'] = 'PHPSESSID'

# initializes extensions
socketio = SocketIO(app)
server_session = Session(app)
login_manager = LoginManager()
login_manager.init_app(app)

# import views
from .pages_views import pages
# from . import api_views
# from . import socket_views

# initialize blueprint
# WARNING: in the example here https://github.com/miguelgrinberg/Flask-SocketIO-Chat/blob/master/app/main/__init__.py
#          the blueprit is registered before the socketIO binding to app. could be important
from .api_views import api
app.register_blueprint(api, url_prefix='/api/v1/')

