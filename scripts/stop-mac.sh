#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="prelegal"

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Stopping and removing $CONTAINER_NAME..."
    docker rm -f "$CONTAINER_NAME" >/dev/null
    echo "Stopped."
else
    echo "No container named $CONTAINER_NAME is running."
fi
