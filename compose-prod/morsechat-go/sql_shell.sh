#
# This is a generic script that opens a root sqlte3 shell in the morsechat db
#

# name of the docker compose service running the sqlite db
SERVICE="morse"


# SQLITE_PATH comes from the container environment, so the database location
# is only configured in docker-compose.yml.
docker compose exec -it "$SERVICE" sh -c 'sqlite3 "$SQLITE_PATH"'
