#!/bin/bash

# Usage: ./scripts/set-webhook.sh <BOT_TOKEN> <DOMAIN>
# Example: ./scripts/set-webhook.sh 123456:ABC https://charging-stations-bot.pages.dev

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <BOT_TOKEN> <DOMAIN>"
  echo "Example: $0 123456:ABC-DEF https://charging-stations-bot.pages.dev"
  exit 1
fi

BOT_TOKEN="$1"
DOMAIN="$2"
WEBHOOK_URL="${DOMAIN}/bot/webhook"

curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}" | python3 -m json.tool

echo ""
echo "Webhook set to: ${WEBHOOK_URL}"
