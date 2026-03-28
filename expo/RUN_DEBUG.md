# Grind – Run & Debug Toolkit

Quick start
- Server: npx vercel dev --listen 3000
- Health: open http://localhost:3000/health – expect { ok: true }
- Check: node scripts/dev-check.mjs
- Expo: npm run start (or bun start)

30‑sec triage
- Offline banner → open Debug → API. If base URL isn’t http://<LAN-IP>:3000, set EXPO_PUBLIC_API_URL
- CORS error → add your Expo origin to ALLOW_ORIGINS in server env
- 401/UNAUTHORIZED on protected tRPC → login again; verify Authorization: Bearer … header exists
- tRPC URL 404 → server not on :3000 or wrong path; confirm /trpc mounted

Symptom → Cause → Fix
- All tRPC endpoints failed → Wrong base URL → Set EXPO_PUBLIC_API_URL to http://<LAN-IP>:3000
- CORS preflight failed → Missing origin → Add origin to ALLOW_ORIGINS or use * in dev
- 401 on protected proc → Missing/expired token → Re‑login; check Authorization header
- Timeout / Network error → Server not running or wrong host → npx vercel dev --listen 3000

Screens (expected)
- Debug → API: shows base URL, health JSON, last error, headers snapshot
- Debug → tRPC: public health.ping OK; protected example.hi shows clear Auth required hint when logged out

Acceptance tests
1) Start server: npx vercel dev --listen 3000 → /health returns JSON
2) node scripts/dev-check.mjs → shows OK and prints EXPO_PUBLIC_API_URL
3) Run app → Connectivity banner shows Connected
4) Open /(debug)/debug-api → Health ok, base URL matches
5) Open /(debug)/debug-trpc → health.ping succeeds; example.hi fails without token with clear hint
