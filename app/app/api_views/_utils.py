from flask import jsonify

def error(error, detail=""):
    return {
        "success": False,
        "error": error,
        "detail": detail
    }

def success(data):
    return {
        "success": True,
        "data": data
    }
