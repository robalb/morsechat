import secrets

def error(error, details="", code=200):
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

#https://github.com/siongui/userpages/blob/master/content/articles/2012/10/11/python-parse-accept-language-in-http-request-header%25en.rst
#https://siongui.github.io/2012/10/11/python-parse-accept-language-in-http-request-header/
# https://www.techonthenet.com/js/language_tags.php
def parseAcceptLanguage(acceptLanguage):
  languages = acceptLanguage.split(",")
  locale_q_pairs = []
  for language in languages:
    if language.split(";")[0] == language:
      # no q => q = 1
      locale_q_pairs.append((language.strip(), "1"))
    else:
      locale = language.split(";")[0].strip()
      q = language.split(";")[1].split("=")[1]
      locale_q_pairs.append((locale, q))
  return locale_q_pairs

def generate_anonymous_callsign(lang_header):
    country_code = "XX"
    #TODO: implement seriously: negotiate lang against a list of approved languages,
    #and associate a country to the language
    if len(lang_header) > 0:
        try:
            parsed = parseAcceptLanguage(lang_header)
            if len(parsed) > 0:
                country_code = parsed[0][0][:2].upper()
        except:
            country_code = "xX"

    return country_code + secrets.token_hex(2).upper()



