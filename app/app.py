from flask import Flask, render_template, url_for, redirect
from flask_socketio import SocketIO

app = Flask(__name__,
        static_url_path='')
app.config['SECRET_KEY'] = 'vnkdjnfjknfl1232#'
socketio = SocketIO(app)


@app.route('/sess')
def sessions():
    return render_template('sessions.html')

@app.route('/')
def gatsby_test():
    return app.send_static_file(
        'index.html'
        )
@app.route('/page-2/')
def gatsby_test2():
    return app.send_static_file(
            'page-2/index.html'
        )

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    return 'You want path: %s' % path

@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file( '404.html'), 404

def messageReceived(methods=['GET', 'POST']):
    print('message was received!!!')


@socketio.on('my event')
def handle_my_custom_event(json, methods=['GET', 'POST']):
    print('received my event: ' + str(json))
    socketio.emit('my response', json, callback=messageReceived)


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0')
