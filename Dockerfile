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

# Sqlite is used for mainteinance access, it's not a runtime dependency
RUN apk add --no-cache \
	  tini \
	  su-exec \
      sqlite

COPY docker/conf/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Nginx config
RUN rm /etc/nginx/conf.d/*
COPY docker/conf/nginx.conf /etc/nginx/
COPY docker/conf/webapp.conf /etc/nginx/conf.d/
RUN chown -R nginx /etc/nginx

USER nginx
# Nginx webapp
WORKDIR /app/webapp
COPY --chown=nginx --from=frontend-builder /app/webapp/dist ./dist/

# Backend
WORKDIR /app/backend
COPY --chown=nginx --from=backend-builder /app/backend/morsechat .

# Database
RUN mkdir /app/backend/db/

ENV APP_ENV=production

# Sadly required by Nginx. TODO: get Nginx to run as non-root
USER root

ENTRYPOINT ["tini", "--", "/entrypoint.sh"]

