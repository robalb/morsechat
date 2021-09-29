from flask import Flask
from flask_socketio import SocketIO
from flask_login import LoginManager
from . import flask_login_base

# create application instance
app = Flask(__name__, static_folder="../static")
app.config['SECRET_KEY'] = 'vnkdjnfjknfl1232#'

# initializes extensions
socketio = SocketIO(app)
login_manager = LoginManager()
login_manager.init_app(app)
@login_manager.user_loader
def user_loader(user_id):
    return flask_login_base.get_user(user_id)

# import views
from .pages_views import pages
# from . import api_views
# from . import socket_views

# initialize blueprint
# WARNING: in the example here https://github.com/miguelgrinberg/Flask-SocketIO-Chat/blob/master/app/main/__init__.py
#          the blueprit is registered before the socketIO binding to app. could be important
from .api_views.api import api
app.register_blueprint(api, url_prefix='/api/v1/')

