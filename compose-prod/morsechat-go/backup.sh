#
# This is a generic script that dumps a sqlite3 db from a container
#

# name of the running morsechat container
SERVICE="morse"

# name of the destination folder where the backup will be stored
DEST_FOLDER="../backups"
FILENAME="morsechat-$(date +'%d-%m-%Y').db"

echo "starting database backup."

# SQLITE_PATH comes from the container environment, so the database location
# is only configured in docker-compose.yml.
docker compose exec -it "$SERVICE" sh -c "sqlite3 \"\$SQLITE_PATH\" \".backup '/tmp/$FILENAME'\""

echo "copying the backup file from the container into the host"
docker compose cp $SERVICE:/tmp/$FILENAME $DEST_FOLDER

echo "done."

