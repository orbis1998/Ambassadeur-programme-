# Deploy send-push Edge Function using secrets from backend/.env
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvFile = Join-Path $Root "backend\.env"
$ProjectRef = "ehmgjgrekjoaohnnlfmw"

if (-not (Test-Path $EnvFile)) { throw "Missing $EnvFile" }
if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host "Set SUPABASE_ACCESS_TOKEN first: https://supabase.com/dashboard/account/tokens"
  Write-Host '  $env:SUPABASE_ACCESS_TOKEN="sbp_..."'
  exit 1
}

Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    Set-Item -Path "env:$($matches[1].Trim())" -Value $matches[2].Trim()
  }
}

Write-Host "==> Setting Edge Function secrets..."
npx supabase secrets set `
  "VAPID_PUBLIC_KEY=$env:VAPID_PUBLIC_KEY" `
  "VAPID_PRIVATE_KEY=$env:VAPID_PRIVATE_KEY" `
  "VAPID_SUBJECT=$($env:VAPID_SUBJECT)" `
  "WEBHOOK_SECRET=$env:WEBHOOK_SECRET" `
  "SUPABASE_URL=$env:SUPABASE_URL" `
  "SUPABASE_SERVICE_ROLE_KEY=$env:SUPABASE_SERVICE_KEY" `
  --project-ref $ProjectRef

Write-Host "==> Deploying send-push..."
npx supabase functions deploy send-push --project-ref $ProjectRef --no-verify-jwt

Write-Host "==> Deploying push-subscribe..."
npx supabase functions deploy push-subscribe --project-ref $ProjectRef

Write-Host "==> Deploying resolve-identifier..."
npx supabase functions deploy resolve-identifier --project-ref $ProjectRef --no-verify-jwt

Write-Host "==> Deploying ambassador-me..."
npx supabase functions deploy ambassador-me --project-ref $ProjectRef

Write-Host "==> Deploying track-click..."
npx supabase functions deploy track-click --project-ref $ProjectRef --no-verify-jwt

Write-Host "==> Applying DB webhook SQL..."
Push-Location (Join-Path $Root "backend")
& (Join-Path $Root "backend\.venv\Scripts\python.exe") scripts/deploy_edge_push.py
Pop-Location

Write-Host "Done."
