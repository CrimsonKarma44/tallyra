#!/bin/sh
set -eu

mkdir -p /data
npx prisma migrate deploy
npx tsx prisma/seed.ts

exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
