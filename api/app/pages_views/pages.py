from app import app

@app.errorhandler(404)
def page_not_found(e):
    return "not an api endpoint", 404

