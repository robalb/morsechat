FROM bitnami/mariadb:latest

COPY my_custom.cnf /opt/bitnami/mariadb/conf/my_custom.cnf

COPY create_tables.sql /docker-entrypoint-initdb.d/init.sql
