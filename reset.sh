#!/bin/bash

set -e

docker-compose down -v
docker-compose up -d --build

echo "DB reset complete"
docker logs -f my-postgres