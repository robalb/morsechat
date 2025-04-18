#
# This is a generic script that opens a root sqlte3 shell in the morsechat db
#

# name of the docker compose service running the sqlite db
SERVICE="morse"
SQLITE_PATH="/app/backend/db/master.sqlite"


docker compose exec -it $SERVICE sqlite3 $SQLITE_PATH
