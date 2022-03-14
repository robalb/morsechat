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
app.config['PUSHER_APP_ID'] = os.environ['PUSHER_APP_ID']
app.config['PUSHER_KEY'] = os.environ['PUSHER_KEY']
app.config['PUSHER_CLUSTER'] = os.environ['PUSHER_CLUSTER']
app.config['PUSHER_SECRET'] = os.environ['PUSHER_SECRET']
app.config['PUSHER_SSL'] = False
#pusher server location configuration
if 'PUSHER_HOST' in os.environ and 'PUSHER_PORT' in os.environ:
  app.config['PUSHER_HOST'] = os.environ['PUSHER_HOST']
  app.config['PUSHER_PORT'] = int(os.environ['PUSHER_PORT'])

pusher = Pusher(app)

# import page views that are not part of the apis
# including pusher endpoints
from .pusher_views import pages

# initialize the api blueprint
from .api_views import api
app.register_blueprint(api, url_prefix='/api/v1/')


#this function will run after every request, setting the appropriate cors headers
#if the app is in development mode
@app.after_request
def after_request(response):
    if development_mode:
        header = response.headers
        header['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        header['Access-Control-Allow-Credentials'] = 'true'
        header['Access-Control-Allow-Headers'] = 'X-Csrf-Magic, Content-Type'
    return response


