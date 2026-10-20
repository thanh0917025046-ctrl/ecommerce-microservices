#!/usr/bin/env bash
set -euo pipefail

echo '=== Containers ==='
docker compose ps

echo
echo '=== Gateway health ==='
curl -s http://localhost:3000/api/health
echo

echo
echo '=== Kafka topics ==='
docker compose exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 --list

echo
echo 'Use the Postman collection for TC-PRO-01, TC-CUS-04, TC-CUS-05, TC-ORD-04 and TC-ORD-05.'
