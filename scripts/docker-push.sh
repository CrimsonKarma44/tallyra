#!/usr/bin/env bash
# Build, tag, and push the Tallyra POS image to GitHub Container Registry.
# Usage: ./scripts/docker-push.sh [tag]
#   tag defaults to "latest". Requires `docker login ghcr.io` first.
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE="ghcr.io/crimsonkarma44/tallyra"
TAG="${1:-latest}"

echo "==> Building $IMAGE:$TAG"
docker build -t "$IMAGE:$TAG" .

echo "==> Pushing $IMAGE:$TAG"
docker push "$IMAGE:$TAG"

echo "Done: $IMAGE:$TAG"