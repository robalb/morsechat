from flask import Flask, render_template, url_for, redirect
from flask_socketio import SocketIO

app = Flask(__name__,
        static_url_path='')
app.config['SECRET_KEY'] = 'vnkdjnfjknfl1232#'
socketio = SocketIO(app)


@app.route('/')
def sessions():
    return render_template('sessions.html')

@app.route('/gatsby')
def gatsby_test():
    return redirect(url_for('static', filename='index.html'))

def messageReceived(methods=['GET', 'POST']):
    print('message was received!!!')


@socketio.on('my event')
def handle_my_custom_event(json, methods=['GET', 'POST']):
    print('received my event: ' + str(json))
    socketio.emit('my response', json, callback=messageReceived)


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0')
