COMMANDS

npx gatsby develop
npx gatsby build --prefix-paths

TOREAD
https://developer.okta.com/blog/2018/12/20/crud-app-with-python-flask-react

RESOURCES
mysql
https://codeshack.io/login-system-python-flask-mysql/
https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursor-execute.html
https://towardsdatascience.com/use-flask-and-sqlalchemy-not-flask-sqlalchemy-5a64fafe22a4
interessante  mariadb
https://mariadb.com/resources/blog/how-to-connect-python-programs-to-mariadb/
https://stackoverflow.com/questions/16311974/connect-to-a-database-in-flask-which-approach-is-better

sessions
https://flask-session.readthedocs.io/en/latest/

password hashing
https://github.com/maxcountryman/flask-bcrypt
https://github.com/red-coracle/flask-argon2 !!!!libreria piccola, non affidabile meglio bcrypt
https://argon2-cffi.readthedocs.io/en/stable/ (non vedo utilità di integrazione flask per librerie del genere)

consider also: flask-login
https://flask-login.readthedocs.io/en/latest/

profanity filters: (non un gran che)
https://gitlab.com/dimitrios/alt-profanity-check/
https://pypi.org/project/profanity-filter/
probably the best, still not a solid solution
https://github.com/snguyenthanh/better_profanity

## INTEGRAZIONE con flask:
gatsby di default genera una spa, quindi con solo index.html e 404.html

il 404 si integra facilmente

    @app.errorhandler(404)
    def page_not_found(e):
        return app.send_static_file( '404.html'), 404

il problema principale è che gli asset statici si trovano in /assets per python, e l'html della spa si aspetta che siano in /
soluzione naiive: fare in modo che python serva file statici quando si visita /<path> , facilmente implementabile tramite  ` app = Flask(__name__, static_url_path='') `

Soluzione migliore, che permette di separare completamente path flask e file statici e quindi di servirli con nginx in modo classico, no configurazioni lato server é:
in `gatsby-config.js` dentro a `module.exports:{}` aggiungere

     assetPrefix: `static`,
questa configurazione è considerata solo quando si combila con `gatsby build --prefix-paths`
e fa si che tutte le risorse nei file html siano prefissate con static/



### INTEGRAZIONE NON SPA
con questo plugin gatsby genera index.html, e le altre pagine ognuna in una cartella dedicata: /pagina-2/index.html
https://github.com/wardpeet/gatsby-plugin-static-site

Il problema è che le pagine sono hostate in file index.html dentro a cartelle.
una configurazione apache o nginx classica non avrebbe problemi con questo, in flask non so
come fare in modo che visite a `/<folder>/` servano `/<folder>/index.html`
Ovviamente il trucco sporco di gestire ogni caso a mano funziona, e si può anche migliorare con regex o cose del genere

    @app.route('/')
    def gatsby_test():
        return app.send_static_file( 'index.html')
    @app.route('/page-2/')
    def gatsby_test2():
        return app.send_static_file( 'page-2/index.html')
sarebbe meglio trovare il modo di implementare la seguente route:
"se ci sono visite a /<folder>/ e non viene richiesto un file in particolare, ne una route particolare di flask servi il file index.html"
forse si può configurare in NGINX una path dedicata a python, ad esempio /api, mentre il resto è servito usando il sistema descritto nella riga sopra

### INTEGRAZIONE SPA
Ha i soliti problemi legati alle spa, perchè le spa fanno schifo:
non si può restituire automaticamente index.html ad ogni /<pagina>/ visitata
perchè poi risulta che ogni path del sito esiste:
anche se poi index.js carica e reindirizza a 404, intanto noi abbiamo dato un 200 ad una visita di una path
inesistente. facendo cosi si finisce solo con indicizzare la pagina 404 su google

quindi se nel caso dell'integrazione non spa basta servire i file con apache/nginx (o fare il casino descritto sopra nel caso flask)
nel caso spa bisogna per forza avere una lista serverside di tutte le path

    @app.route('/')
    @app.route('/page-2/')
    def gatsby_test():
        return app.send_static_file( 'index.html')

questo funziona, ma ha un problema strano: visitando direttamente /page-2/ oppure ricaricando
la pagina quando ci si trova in /page-2/ js decide di servire la home, e non page-2
motivo in piu per non usare spa




