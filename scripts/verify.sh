#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> unit tests"
npm test

echo "==> typecheck"
npx tsc --noEmit

echo "==> lint"
npx eslint . --max-warnings=0

echo "verify: ok"
