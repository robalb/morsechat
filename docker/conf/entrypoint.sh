#!/bin/sh
set -eu

# This script launches and manages both Nginx and the golang app
# in the same container. It replaces supervisord as a rudimental
# init system.
#
# Requirements: POSIX SH, su-exec

NGINX_PID=""
APP_PID=""
EXIT_CODE=0
SHUTTING_DOWN=0

cleanup() {
  if [ "$SHUTTING_DOWN" -eq 1 ]; then return; fi
  SHUTTING_DOWN=1

  echo "[entripoint.sh] Shutting down..."

  if [ -n "$NGINX_PID" ] && kill -0 "$NGINX_PID" 2>/dev/null; then
    kill -QUIT "$NGINX_PID"
  fi

  if [ -n "$APP_PID" ] && kill -0 "$APP_PID" 2>/dev/null; then
    kill -TERM "$APP_PID"
  fi

  wait "$NGINX_PID" 2>/dev/null || true
  wait "$APP_PID"   2>/dev/null || true

  exit "$EXIT_CODE"
}

trap cleanup TERM INT

echo "[entrypoint.sh] Starting backend..."
su-exec nginx /app/backend/morsechat &
APP_PID=$!

echo "[entrypoint.sh] Starting nginx..."
nginx &
NGINX_PID=$!

while kill -0 "$APP_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do
  sleep 0.2
done

if ! kill -0 "$APP_PID" 2>/dev/null; then
  wait "$APP_PID" 2>/dev/null
  EXIT_CODE=$?
  echo "[entrypoint.sh] Backend exited (code: $EXIT_CODE)"
else
  wait "$NGINX_PID" 2>/dev/null
  EXIT_CODE=$?
  echo "[entrypoint.sh] Nginx exited (code: $EXIT_CODE)"
fi

cleanup
