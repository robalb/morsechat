from jsonschema import ValidationError
#basic imports
from . import api
from ._utils import success, error

#handle 404s in a custom way
@api.route('/', defaults={'path': ''})
@api.route('/<path:path>')
def api_page_not_found(path):
    return error(404, details="api endpoint not found"), 404


#handle 400 errors, mostly issued by flask-expect-json
@api.app_errorhandler(400)
def bad_request(err):
    if isinstance(err.description, ValidationError):
        original_error = err.description
        return error(original_error.message), 400
    # handle other "Bad Request"-errors
    return err


