# Supabase Edge Functions — VSM Ambassador

## send-push

Envoie les notifications Web Push (VAPID) quand une ligne est insérée dans `push_outbox` (via trigger Postgres + pg_net).

### Déploiement (une fois)

1. Installer le CLI et se connecter :
   ```bash
   npx supabase login
   ```

2. Définir les secrets (depuis `backend/.env`) :
   ```bash
   npx supabase secrets set \
     VAPID_PUBLIC_KEY="..." \
     VAPID_PRIVATE_KEY="..." \
     VAPID_SUBJECT="mailto:contact@vsmcollection.com" \
     WEBHOOK_SECRET="..." \
     SUPABASE_URL="https://ehmgjgrekjoaohnnlfmw.supabase.co" \
     SUPABASE_SERVICE_ROLE_KEY="..." \
     --project-ref ehmgjgrekjoaohnnlfmw
   ```

3. Déployer la fonction :
   ```bash
   npx supabase functions deploy send-push --project-ref ehmgjgrekjoaohnnlfmw --no-verify-jwt
   ```

4. Appliquer le webhook SQL (si pas déjà fait) :
   ```bash
   cd backend
   python scripts/deploy_edge_push.py
   ```

### Flux

```
DB trigger → push_outbox INSERT → pg_net POST → /functions/v1/send-push → web-push (VAPID)
```

Le worker FastAPI (`PUSH_WORKER_ENABLED=false` par défaut) n'est plus nécessaire en production.
