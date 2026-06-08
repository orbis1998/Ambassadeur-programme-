# VSM Ambassador Program — PRD

## Original Problem Statement
PWA séparée du site officiel www.vsmcollection.com permettant aux ambassadeurs de s'inscrire (candidature) et de se connecter à leur tableau de bord. La validation des candidatures est faite par l'admin depuis le site officiel. Connexion directe à la même base Supabase. Retraits via Mobile Money (Airtel/M-Pesa/Orange Money). Dashboard avec stats, lien parrainage, classement, badges, etc. Demande de retrait possible après 10 commandes minimum.

## Tech Stack
- Frontend: React 19 (CRA + craco), TailwindCSS, framer-motion, lucide-react, qrcode.react, @supabase/supabase-js
- Backend: FastAPI (thin proxy for Supabase service-role operations)
- Database / Auth / Storage: Supabase (existing project shared with vsmcollection.com)
- PWA: manifest.json + service worker (cache shell)

## Architecture
- Frontend ↔ Supabase REST/Auth (anon key) for reads (orders, links, clicks, withdrawals, profile)
- Frontend → FastAPI → Supabase service-role for `ambassador_applications` INSERT (RLS-protected)
- Withdrawal request: RPC `request_ambassador_withdrawal` (fallback: direct insert if RPC unavailable)
- Brand identity inherited from vsm-style-hub: VSM Red `hsl(352 84% 49%)` on dark `hsl(0 0% 4%)`, Oswald (display) + Inter (body), sharp 0.25rem radius

## Core Features Implemented (2026-06-08)
1. **Login** (`/login`) — Supabase email/password
2. **Application** (`/apply`) — 4-step wizard (Personal info → Social → Motivation → Promotion plan + consent)
   - Creates Supabase Auth account via backend proxy
   - Inserts into `ambassador_applications` with status=pending
   - Extra fields packed into the `motivation` text (city, age, IG/FB/TT, followers, etc.)
3. **Pending / Rejected screen** (`/pending`)
4. **Dashboard** (`/dashboard`) with:
   - Greeting, badge code (VSM-XXXX from user.id hash), tier display
   - 4 stat cards: sales, revenue, commissions, clicks
   - Tier progression bar (Starter → Bronze → Silver → Gold → Elite)
   - Ambassador referral link + copy + share buttons + QR code
   - This-month performance
   - Withdrawal CTA (locked until 10 confirmed sales)
   - Commission history table
   - Badges (Nouvel Ambassadeur, 10/50 ventes, Elite, Top du mois)
   - Withdrawal history
5. **Withdraw** (`/dashboard/withdraw`) — operator picker (Airtel/M-Pesa/Orange), MSISDN, beneficiary name, RPC call
6. **Leaderboard** (`/dashboard/leaderboard`) — top 20 ambassadors of the month
7. **Resources** (`/dashboard/resources`) — product images, hero images, promo texts
8. **Notifications** (`/dashboard/notifications`) — sales + withdrawal events
9. **Settings** (`/dashboard/settings`) — profile, password, support, logout
10. **PWA** — manifest + SW + installable on mobile

## Database Mapping (existing Supabase tables used)
- `ambassador_applications` (id, full_name, phone, email, username, main_platform, profile_url, motivation, status, user_id, created_at)
- `ambassador_links` (slug, ambassador_id, target_type, active)
- `ambassador_clicks` (link_id, clicked_at, referrer, user_agent)
- `ambassador_withdrawal_requests` (ambassador_id, mobile_operator, msisdn, beneficiary_name, status, admin_note)
- `profiles` (id, full_name, email, phone, role)
- `orders` (ambassador_id, source_link_id, total_amount, status)
- `settings` (key=`ambassador_commission_rate` optional)
- RPCs: `request_ambassador_withdrawal`, `ambassador_confirmed_sales_count`

## Commission Logic
- Rate: from `settings.ambassador_commission_rate` (fallback 10%)
- Commission = total_amount × rate% per confirmed order
- Available = total_commissions − (sum of paid+pending withdrawals)
- Min 10 confirmed sales before withdrawal allowed

## Currency
- All amounts in FC (Franc Congolais) — formatted with `Intl.NumberFormat('fr-FR')`

## Bug fixes (2026-06-08, iteration 1)
- Fixed idempotency on `/api/ambassador/apply` (no more duplicate pending rows demoting approved ambassadors).
- `/api/ambassador/me` now prefers `status=approved` over latest row.
- Login form: fixed double-read of fetch response on error.
- Apply consent checkboxes: `data-testid` is now on the actual `<input type=checkbox>` for stable test automation.

## Backlog / Future
- P1: Real-time order tracking via Supabase Realtime channels
- P1: Push notifications (Web Push API + VAPID)
- P1: Multi-language (FR/EN)
- P2: Cascade referrals (ambassador recrute ambassadeur)
- P2: Monthly challenges with bonus rewards
- P2: Auto-redirect from `/ref/:slug` to vsmcollection.com with click tracking

## Test Credentials
See `/app/memory/test_credentials.md`
