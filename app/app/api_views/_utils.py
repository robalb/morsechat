from flask import jsonify

def error(error, details=""):
    return {
        "success": False,
        "error": error,
        "details": details
    }

def success(data):
    return {
        "success": True,
        "data": data
    }


def clearly_a_profanity(data):
    #TODO implement this in a separate package outside of this
    #repository. Not everything can be open source
    return False

