#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-https://api.yourrulesgame.ru/api}"
WEB_URL="${WEB_URL:-https://yourrulesgame.ru/}"

echo "API health:"
curl -fsS "$API_BASE/health"
echo

echo "API ready:"
curl -fsS "$API_BASE/ready"
echo

echo "API version:"
curl -fsS "$API_BASE/version"
echo

echo "Web shell:"
curl -fsSI "$WEB_URL" | sed -n '1,8p'

echo "CORS preflight:"
curl -fsSI -X OPTIONS "$API_BASE/home" \
  -H "Origin: https://yourrulesgame.ru" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,content-type" | sed -n '1,12p'

echo "Smoke OK"
