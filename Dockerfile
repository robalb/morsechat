# production dockerfile
#------------------------------
#  First step: frontend build
#------------------------------
FROM node:16 as frontend-builder

WORKDIR /app/webapp
COPY webapp/package*.json ./
RUN npm ci
COPY webapp/ ./
RUN npm run build

#------------------------------
#  Second step: golang build
#------------------------------
FROM golang:1.23:3 as backend-builder
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN go build -o morsechat cmd/morsechat/main.go

#------------------------------
#  Third step: production image
#------------------------------
FROM python:3.9-buster

# Install nginx & supervisor
RUN useradd --no-create-home nginx
RUN apt-get update \
    && apt-get install --no-install-recommends --no-install-suggests -y \
        nginx  \
        supervisor \
    && rm -rf /var/lib/apt/lists/*

# forward request and error logs to docker log collector
# https://stackoverflow.com/questions/22541333/have-nginx-access-log-and-error-log-log-to-stdout-and-stderr-of-master-process
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
	&& ln -sf /dev/stderr /var/log/nginx/error.log


# Remove nginx base config
RUN rm /etc/nginx/sites-enabled/default
# copy custom config to all services
COPY docker/nginx-uwsgi-flask/conf/nginx.conf /etc/nginx/
COPY docker/nginx-uwsgi-flask/conf/flaskapp.conf /etc/nginx/conf.d/
COPY docker/nginx-uwsgi-flask/conf/uwsgi.ini /etc/uwsgi/
COPY docker/nginx-uwsgi-flask/conf/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# ------> Dragons here <------ #

WORKDIR /backend

#copy the backend
COPY api .

#copy the frondend files generated in the previous step
COPY --from=frontendbuild /frontend/dist ./dist/

ENV FLASK_APP=main.py
ENV FLASK_ENV=production
ENV FLASK_DEBUG=0

ENTRYPOINT ["/usr/bin/supervisord"]
