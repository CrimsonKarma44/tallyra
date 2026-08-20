#!/usr/bin/env bash
# Builds the Tallyra POS image and runs a full smoke test on a throwaway
# container + volume, then cleans up. Requires Docker (run with sudo if needed).
# Usage: sudo ./scripts/docker-smoke.sh
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE="ledger-pos:test"
CONTAINER="ledger-smoke"
VOLUME="ledger-smoke-data"
PORT="${LEDGER_SMOKE_PORT:-3100}"
AUTH_USERNAME="${AUTH_USERNAME:-agent}"
AUTH_PASSWORD="${AUTH_PASSWORD:-changeme}"
SESSION_SECRET="${SESSION_SECRET:-smoke-test-secret-0123456789abcdef}"

fail() {
  echo "FAIL: $1" >&2
  docker logs "$CONTAINER" 2>&1 | tail -30 >&2 || true
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker volume rm "$VOLUME" >/dev/null 2>&1 || true
  exit 1
}

echo "==> Building image"
docker build -t "$IMAGE" . || fail "docker build"

echo "==> Starting fresh container on port $PORT"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker volume rm "$VOLUME" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -p "$PORT:3000" \
  -v "$VOLUME:/data" \
  -e DATABASE_URL=file:/data/pos.db \
  -e AUTH_USERNAME="$AUTH_USERNAME" \
  -e AUTH_PASSWORD="$AUTH_PASSWORD" \
  -e SESSION_SECRET="$SESSION_SECRET" \
  "$IMAGE" >/dev/null || fail "docker run"

BASE="http://127.0.0.1:$PORT"

echo "==> Waiting for app to come up"
for i in $(seq 1 60); do
  if curl -sf -o /dev/null "$BASE/login"; then break; fi
  sleep 1
  [ "$i" -eq 60 ] && fail "app did not start"
done

echo "==> Landing page"
curl -sf "$BASE/" | grep -q "Replace the paper sales book." || fail "landing page content missing"

echo "==> Health"
curl -sf "$BASE/api/v1/health" | grep -q '"ok":true' || fail "health check"

echo "==> Seed + login"
TOKEN=$(curl -sf -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$AUTH_USERNAME\",\"password\":\"$AUTH_PASSWORD\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])') || fail "login"
curl -sf "$BASE/api/v1/me" -H "Authorization: Bearer $TOKEN" | grep -q '"hasPersonalLedger":true' || fail "me endpoint"

echo "==> Tallyra ledger read (seeded personal sales)"
curl -sf "$BASE/api/v1/sales?ledger=personal" -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); assert len(d["sales"]) > 0, "no seeded sales"; print("  sales:", len(d["sales"]))' || fail "ledger read"

echo "==> Write + restart persistence"
SALE_ID=$(curl -sf -X POST "$BASE/api/v1/sales" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"note":"smoke-persist","lines":[{"name":"Test item","quantity":1,"unitPrice":10}]}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["sale"]["id"])') || fail "sale create"
docker restart "$CONTAINER" >/dev/null || fail "docker restart"
for i in $(seq 1 60); do
  if curl -sf -o /dev/null "$BASE/login"; then break; fi
  sleep 1
  [ "$i" -eq 60 ] && fail "app did not restart"
done
curl -sf "$BASE/api/v1/sales/$SALE_ID" -H "Authorization: Bearer $TOKEN" \
  | grep -q "smoke-persist" || fail "sale did not persist across restart"

echo "==> Cleaning up"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker volume rm "$VOLUME" >/dev/null 2>&1 || true

echo "ALL CHECKS PASSED"