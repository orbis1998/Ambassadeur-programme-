# Supabase Edge Function — send-push

## Ce qu'il te faut (1 seule chose que je n'ai pas)

Les clés VAPID, service role, webhook secret sont déjà dans `backend/.env`.

Pour **déployer** la fonction, Supabase exige **ton token personnel** (pas la service role key) :

1. Va sur https://supabase.com/dashboard/account/tokens  
2. **Generate new token** → copie-le  
3. Dans le terminal :

```bash
# Git Bash / macOS / Linux
export SUPABASE_ACCESS_TOKEN="sbp_xxxxxxxx"

# PowerShell
$env:SUPABASE_ACCESS_TOKEN="sbp_xxxxxxxx"
```

Ensuite lance le script automatique (lit `backend/.env`) :

```bash
# Bash (Git Bash sur Windows)
bash supabase/deploy.sh

# PowerShell
.\supabase\deploy.ps1
```

---

## Déploiement manuel (étape par étape)

### 1. Login CLI (une fois)

```bash
npx supabase login
```

### 2. Secrets (valeurs dans `backend/.env`)

```bash
npx supabase secrets set \
  VAPID_PUBLIC_KEY="..." \
  VAPID_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" \
  VAPID_SUBJECT="mailto:contact@vsmcollection.com" \
  WEBHOOK_SECRET="..." \
  SUPABASE_URL="https://ehmgjgrekjoaohnnlfmw.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="..." \
  --project-ref ehmgjgrekjoaohnnlfmw
```

### 3. Déployer la fonction

```bash
npx supabase functions deploy send-push \
  --project-ref ehmgjgrekjoaohnnlfmw \
  --no-verify-jwt
```

### 4. Lier la base (webhook SQL)

```bash
cd backend
python scripts/deploy_edge_push.py
```

---

## Depuis le Dashboard Supabase (sans CLI)

Le Dashboard permet de gérer les **secrets** et voir les fonctions, mais **le déploiement du code** se fait surtout via CLI.

Chemin Dashboard :
- **Edge Functions** → tu verras `send-push` après un deploy CLI  
- **Project Settings → Edge Functions → Secrets** → ajoute les mêmes variables que ci-dessus  
- **Database → Webhooks** : optionnel si `deploy_edge_push.py` a déjà configuré pg_net

---

## Vérifier que ça marche

1. Un ambassadeur approuvé active les notifications (dashboard)  
2. Change un statut en base (ou insère une commande test)  
3. Vérifie `push_outbox` : `processed_at` doit se remplir  
4. Logs : Dashboard → Edge Functions → send-push → Logs

---

## Flux

```
Trigger Postgres → push_outbox → pg_net → /functions/v1/send-push → Web Push VAPID
```

Le backend FastAPI n'a plus besoin de tourner 24/7 pour les push (`PUSH_WORKER_ENABLED=false`).
