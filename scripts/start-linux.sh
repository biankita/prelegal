#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="prelegal:latest"
CONTAINER_NAME="prelegal"
PORT="${PORT:-8000}"

cd "$(dirname "$0")/.."

echo "Building Docker image $IMAGE_NAME..."
docker build -t "$IMAGE_NAME" .

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Removing existing container $CONTAINER_NAME..."
    docker rm -f "$CONTAINER_NAME" >/dev/null
fi

echo "Starting $CONTAINER_NAME on http://localhost:${PORT}..."
docker run -d --name "$CONTAINER_NAME" -p "${PORT}:8000" "$IMAGE_NAME"

echo "Done. Tail logs with: docker logs -f $CONTAINER_NAME"
