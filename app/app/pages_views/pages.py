from flask import render_template, url_for, redirect, Blueprint
from app import app

#python only routes, apis, etch
@app.route('/sess')
def sessions():
    return render_template('sessions.html')

#static pages (this project is not using nginx, with nginx this is not required)
@app.route('/')
def gatsby_test():
    return app.send_static_file( 'index.html')
@app.route('/page-2/')
def gatsby_test2():
    return app.send_static_file( 'page-2/index.html')

#404 page (this also should be handled by nginx)
@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file( '404.html'), 404

