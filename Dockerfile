# production dockerfile
#------------------------------
#  First step: frontend build
#------------------------------
FROM node:20.11.1 AS frontend-builder

WORKDIR /app/webapp
COPY webapp/package*.json ./
RUN npm ci
COPY webapp/ ./
RUN npm run build

#------------------------------
#  Second step: golang build
#------------------------------
FROM golang:1.23.3 AS backend-builder

WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN go build \
    -o morsechat \
    -tags 'osusergo,netgo,static,' \
    -ldflags '-extldflags "-static"' \
    cmd/morsechat/main.go

#------------------------------
#  Third step: production image
#------------------------------
FROM nginx:stable-alpine3.20

RUN apk add --update \
      supervisor \
      sqlite \
    && rm  -rf /tmp/* /var/cache/apk/*

#supervisord config
COPY docker/conf/supervisord.conf /etc/

#nginx config
RUN rm /etc/nginx/conf.d/*
COPY docker/conf/nginx.conf /etc/nginx/
COPY docker/conf/webapp.conf /etc/nginx/conf.d/
RUN chown -R nginx /etc/nginx

USER nginx
#nginx webapp
WORKDIR /app/webapp
COPY --chown=nginx --from=frontend-builder /app/webapp/dist ./dist/

#backend
WORKDIR /app/backend
COPY --chown=nginx --from=backend-builder /app/backend/morsechat .

#database
RUN mkdir /app/backend/db/

ENV APP_ENV=production
USER root
ENTRYPOINT ["supervisord", "--nodaemon", "--configuration", "/etc/supervisord.conf"]

