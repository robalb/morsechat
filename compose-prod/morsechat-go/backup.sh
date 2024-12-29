#
# This is a generic script that dumps a database from a mariadb docker container
# tested on bitnami/mariadb
#
# this script expects an .env file with the following variables set:
# DB_DBNAME
# DB_ROOT_PASSWORD
#

# name of the running mariadb container
SERVICE="morsechat-mariadb-1"

# name of the destination folder where the backup will be stored
DEST_FOLDER="../backups"



set -o allexport
source .env set
+o allexport

FILENAME="$DB_DBNAME-$(date +'%d-%m-%Y').sql"

echo "starting backup for database: "
echo $DB_DBNAME
docker exec -it $SERVICE mysqldump -u root -p$DB_ROOT_PASSWORD $DB_DBNAME --result-file=/tmp/$FILENAME

echo "copying the backup file from the container into the host"
docker cp $SERVICE:/tmp/$FILENAME $DEST_FOLDER

echo "done."
