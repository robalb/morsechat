from flask_socketio import send, emit, join_room, leave_room
from .. import socketio
from .. import app

@socketio.on('connect')
def test_connect(auth):
    app.logger.info("++ client connected")
    emit('my response', {'data': 'Connected'})

@socketio.on('disconnect')
def test_disconnect():
    app.logger.info("-- client disconnected")

@socketio.on('message')
def handle_message(message):
    app.logger.info("handle message")
    app.logger.info(message)
    send("i received your message")

@socketio.on('join')
def on_join(data):
    app.logger.info("join room")
    username = data['username']
    room = data['room']
    join_room(room)
    send(username + ' has entered the room.', to=room)

@socketio.on('leave')
def on_leave(data):
    app.logger.info("leave room")
    username = data['username']
    room = data['room']
    leave_room(room)
    send(username + ' has left the room.', to=room)
