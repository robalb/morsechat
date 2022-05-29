#basic imports
from . import api
from ._utils import success, error
from flask import request
from .. import app

@api.route('/nat-test', methods=['POST', 'GET'])
def api_nat_test():
    app.logger.info("nat-test headers:")
    app.logger.info(request.headers)
    app.logger.info("nat-test remote_addr:")
    app.logger.info(request.remote_addr)
    return "OK"


