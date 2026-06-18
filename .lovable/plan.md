
# Market Knight Upgrade Plan

Major upgrade touching auth, data layer, tool integration, and a new home dashboard. Here's the proposed approach.

## 1. Enable Lovable Cloud + Google Auth

- Enable Lovable Cloud (Supabase) for the project.
- Configure Google as a sign-in provider via the managed broker.
- Add a public `/auth` route with the Market Knight logo and a "Sign in with Google" button.
- Wrap all existing routes (`/`, `/ict`, `/risk`, `/alerts`, `/sessions`, `/journal`, `/learn`) under the integration-managed `_authenticated/` layout so unauthenticated users get bounced to `/auth`.
- Create a `profiles` table that auto-populates from `auth.users` on signup (id, email, full_name, avatar_url, created_at), with RLS scoped to `auth.uid()`.

## 2. Database Schema (replaces localStorage)

All tables have RLS scoped to `auth.uid() = user_id` and proper GRANTs.

```text
profiles          (id, email, full_name, avatar_url)
trades            (id, user_id, date, asset, direction, setup, entry, stop,
                   target, exit, outcome, pnl, emotion, followed_plan,
                   notes, lesson, created_at)
asset_levels      (id, user_id, asset, pdh, pdl, pivot, r1, s1, round_levels,
                   updated_at)  -- one row per (user, asset)
user_preferences  (user_id PK, current_asset, account_size, risk_pct,
                   session_prefs jsonb, updated_at)
alerts            (id, user_id, asset, direction, level, level_type,
                   triggered_at, acknowledged)
checklist_log     (id, user_id, date, marked_levels, checked_session,
                   risk_calculated)  -- one row per (user, date)
```

- Replace the `useLocalStorage` hook calls in `journal.tsx`, `risk.tsx`, `index.tsx` (levels), `sessions.tsx`, `alerts.tsx` with TanStack Query + server functions backed by Supabase.
- Keep `useLocalStorage` only as a fallback for non-authenticated transient UI state (e.g. open tab).

## 3. Cross-Tool Data Sharing

- **Level Calculator** (`/`) writes the active asset + computed levels to `asset_levels` and the user's `current_asset` in `user_preferences`.
- **Risk Calculator** (`/risk`) reads `current_asset` and pulls its levels from `asset_levels` to pre-fill entry/stop suggestions.
- **Screen Marker / Alerts** (`/alerts`) reads `asset_levels` to render markers; firing an alert inserts into `alerts` table and navigates to `/journal?fromAlert=<id>`.
- **Journal** (`/journal`) reads `?fromAlert=...` on mount, pre-fills asset/direction/level from the alert row, then marks it acknowledged.

## 4. Dashboard Home (new `/home` route)

New `/home` route becomes the default landing after sign-in. The current Level Calculator stays at `/`.

Sections:
- **Today's session status** — derived from `/sessions` logic (Asia/London/NY open?).
- **Last 5 trades** — recent rows from `trades`.
- **Win rate** — wins / total over last 30 days.
- **Plan discipline %** — `followed_plan` ratio.
- **Active levels set** — count of assets with rows in `asset_levels` updated in last 24h.
- **Daily checklist** — three toggles backed by `checklist_log` for today: marked levels, checked session, risk calculated. Auto-tick when corresponding action happens elsewhere.

Bottom nav gets a new "Home" tab as the first item (Home, Levels, ICT, Risk, Alerts, Sessions, Journal, Learn → 8 tabs; will redesign grid to `grid-cols-8` or move Learn to overflow).

## Technical Notes

- Use `createServerFn` + `requireSupabaseAuth` middleware for all DB reads/writes.
- TanStack Query for caching; invalidate on mutations.
- Migration adds enum types for `outcome` and `direction`.
- `supabase.auth.onAuthStateChange` wired once in `__root.tsx` to invalidate queries.
- The `lovable.auth.signInWithOAuth("google", ...)` broker call is used for Google.
- All public-route loaders avoided — protected routes use `_authenticated/` subtree.

## Scope / Tradeoffs

- This is a substantial migration: ~6 new tables, ~10 server functions, every existing route touched, new home route, new auth route.
- Existing localStorage data on users' devices will NOT be migrated automatically (they'll start fresh in the cloud). I can add a one-time client-side import if you want.
- Bottom nav with 8 items on mobile gets tight — I'll either shrink labels or group Learn behind a "More" menu.

Approve and I'll implement, or tell me what to adjust (e.g. skip the localStorage migration, defer alerts→journal wiring, different home layout).
