from jsonschema import ValidationError
#basic imports
from . import api
from ._utils import success, error

#handle 404s in a custom way
@api.route('/', defaults={'path': ''})
@api.route('/<path:path>', methods=['GET', 'POST'])
def api_page_not_found(path):
    return error(404, details="api endpoint not found"), 404


#handle 400 errors, mostly issued by flask-expect-json
@api.app_errorhandler(400)
def bad_request(err):
    #catch 400 errors from flask-expect-json and return an api response instead
    if isinstance(err.description, ValidationError):
        original_error = err.description
        return error("bad_schema", details=original_error.message), 200
    #return the other 400 as normal errors
    return err
