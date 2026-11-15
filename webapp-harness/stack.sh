#!/usr/bin/env bash
set -euo pipefail

HARNESS="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HARNESS")"
RUN="$HARNESS/.run"
WEB_PORT="${WEB_PORT:-5173}"
mkdir -p "$RUN"

listening() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }
serving() { curl -fsS -o /dev/null "http://localhost:$WEB_PORT/" 2>/dev/null; }

wait_for() {
  for _ in $(seq 1 180); do
    if listening "$1"; then return 0; fi
    sleep 1
  done
  echo "$2 did not come up on :$1, see $RUN/$2.log" >&2
  return 1
}

kill_tree() {
  local child
  for child in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$child"; done
  kill "$1" 2>/dev/null || true
}

start() {
  local name=$1 dir=$2
  shift 2
  (cd "$ROOT/$dir" && nohup "$@" >"$RUN/$name.log" 2>&1 & echo $! >"$RUN/$name.pid")
}

up() {
  if listening 8080; then
    echo "backend  already listening on :8080"
  else
    start backend backend go run ./cmd/morsechat
    wait_for 8080 backend
    echo "backend  started on :8080, log $RUN/backend.log"
  fi

  if listening "$WEB_PORT"; then
    if serving; then
      echo "webapp   already serving http://localhost:$WEB_PORT"
    else
      echo "webapp   :$WEB_PORT is taken by something that does not serve the app" >&2
      exit 1
    fi
  else
    [ -d "$ROOT/webapp/node_modules" ] || (cd "$ROOT/webapp" && npm install)
    start webapp webapp npx vite --host --port "$WEB_PORT" --strictPort
    wait_for "$WEB_PORT" webapp
    echo "webapp   started on http://localhost:$WEB_PORT, log $RUN/webapp.log"
  fi
}

down() {
  local name
  for name in webapp backend; do
    if [ -f "$RUN/$name.pid" ]; then
      kill_tree "$(cat "$RUN/$name.pid")"
      rm -f "$RUN/$name.pid"
      echo "$name  stopped"
    else
      echo "$name  not started by this script, left alone"
    fi
  done
}

status() {
  if listening 8080; then echo "backend  up on :8080"; else echo "backend  down"; fi
  if serving; then echo "webapp   up on http://localhost:$WEB_PORT"; else echo "webapp   down on :$WEB_PORT"; fi
}

case "${1:-}" in
  up) up ;;
  down) down ;;
  status) status ;;
  *) echo "usage: $0 up|down|status   (WEB_PORT=3000 to use the other port the backend allows)" >&2; exit 1 ;;
esac
