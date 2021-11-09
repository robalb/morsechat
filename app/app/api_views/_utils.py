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

country_codes = [
  ['ar-SA', 'SA'],
  ['bn-BD', 'BD'],
  ['bn-IN', 'IN'],
  ['cs-CZ', 'CZ'],
  ['da-DK', 'DK'],
  ['de-AT', 'AT'],
  ['de-CH', 'CH'],
  ['de-DE', 'DE'],
  ['el-GR', 'GR'],
  ['en-AU', 'AU'],
  ['en-CA', 'CA'],
  ['en-GB', 'GB'],
  ['en-IE', 'IE'],
  ['en-IN', 'IN'],
  ['en-NZ', 'NZ'],
  ['en-US', 'US'],
  ['en-ZA', 'ZA'],
  ['es-AR', 'AR'],
  ['es-CL', 'CL'],
  ['es-CO', 'CO'],
  ['es-ES', 'ES'],
  ['es-MX', 'MX'],
  ['es-US', 'US'],
  ['fi-FI', 'FI'],
  ['fr-BE', 'BE'],
  ['fr-CA', 'CA'],
  ['fr-CH', 'CH'],
  ['fr-FR', 'FR'],
  ['he-IL', 'IL'],
  ['hi-IN', 'IN'],
  ['hu-HU', 'HU'],
  ['id-ID', 'ID'],
  ['it-CH', 'CH'],
  ['it-IT', 'IT'],
  ['jp-JP', 'JP'],
  ['ko-KR', 'KR'],
  ['nl-BE', 'BE'],
  ['nl-NL', 'NL'],
  ['no-NO', 'NO'],
  ['pl-PL', 'PL'],
  ['pt-BR', 'BR'],
  ['pt-PT', 'PT'],
  ['ro-RO', 'RO'],
  ['ru-RU', 'RU'],
  ['sk-SK', 'SK'],
  ['sv-SE', 'SE'],
  ['ta-IN', 'IN'],
  ['ta-LK', 'LK'],
  ['th-TH', 'TH'],
  ['tr-TR', 'TR'],
  ['zh-CN', 'CN'],
  ['zh-HK', 'HK'],
  ['zh-TW', 'TW'],
]

def get_country_names():
    return list(map(lambda x: x[1], country_codes))


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

def negotiate_country(lang_header):
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
    return country_code

def generate_anonymous_callsign(country):
    return country + secrets.token_hex(2).upper()



