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
