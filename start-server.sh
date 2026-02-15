#!/usr/bin/env bash
# SINET Audio Lekar — start-server (Linux)
# Usage: ./start-server.sh [PORT]
set -e
PORT="${1:-8000}"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"
PY=python3
command -v python3 >/dev/null 2>&1 || PY=python
IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo ""
echo "✅ SINET server start"
echo "   Local:  http://localhost:$PORT/index.html"
[ -n "$IP" ] && echo "   LAN:    http://$IP:$PORT/index.html"
echo ""
exec "$PY" -m http.server "$PORT" --bind 0.0.0.0
