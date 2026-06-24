#!/usr/bin/env bash
# Deploy send-push Edge Function using secrets from backend/.env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"
PROJECT_REF="ehmgjgrekjoaohnnlfmw"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Set SUPABASE_ACCESS_TOKEN first (https://supabase.com/dashboard/account/tokens)"
  echo "  export SUPABASE_ACCESS_TOKEN=sbp_..."
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

echo "==> Setting Edge Function secrets..."
npx supabase secrets set \
  "VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}" \
  "VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}" \
  "VAPID_SUBJECT=${VAPID_SUBJECT:-mailto:contact@vsmcollection.com}" \
  "WEBHOOK_SECRET=${WEBHOOK_SECRET}" \
  "SUPABASE_URL=${SUPABASE_URL}" \
  "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}" \
  --project-ref "$PROJECT_REF"

echo "==> Deploying send-push..."
npx supabase functions deploy send-push \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt

echo "==> Applying DB webhook SQL..."
cd "$ROOT/backend" && python scripts/deploy_edge_push.py

echo "Done. Edge function: ${SUPABASE_URL}/functions/v1/send-push"
