fake_db = { '1a' : "antonio", 'f3': "gianna", '3g': "mariacarlotta" }

class User:
    id = ""
    authenticated = False
    def is_active(self):
        return True

    def get_id(self):
        return self.id

    def is_authenticated(self):
        return self.authenticated

    def is_anonymous(self):
        return False

def get_user(user_id):
    if user_id not in fake_db:
        return None
    user = User()
    user.id = user_id
    user.name = fake_db[user_id]
    user.authenticated = False
    return user

