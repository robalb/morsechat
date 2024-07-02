#
# This is a generic script that opens a root sql shell in the morsechat db
# tested on bitnami/mariadb
#
# this script expects an .env file with the following variables set:
# DB_DBNAME
# DB_ROOT_PASSWORD
#

# name of the running mariadb container
SERVICE="morsechat-mariadb-1"

set -o allexport
source .env set
+o allexport

docker exec -it $SERVICE mysql -u root -p$DB_ROOT_PASSWORD $DB_DBNAME
