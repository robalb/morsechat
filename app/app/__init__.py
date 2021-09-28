from flask import Flask
from flask_socketio import SocketIO
from flask_login import LoginManager

# create application instance
app = Flask(__name__, static_folder="../static")
app.config['SECRET_KEY'] = 'vnkdjnfjknfl1232#'

# initializes extensions
socketio = SocketIO(app)
# login_manager = LoginManager()
# login_manager.init_app(app)

# import views
from .pages_views import pages
# from . import api_views
# from . import socket_views
