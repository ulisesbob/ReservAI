# CURRENT_STATE.md — 2026-03-20 21:55 ART

## Build / Diagnostics
- `npm run lint` → ✅ clean
- `npx tsc --noEmit` → ✅ no type errors
- `npm run build` → ✅ succeeds (Next.js 14.2.35)
- Prisma Client regenerates successfully from `prisma.config.ts`

## Known Issues / TODOs
1. **MercadoPago access token** — current `MERCADOPAGO_ACCESS_TOKEN` reportedly returning 401 when creating subscriptions in production. Need to refresh token and revalidate `createSubscription` + webhook flows.
2. **Resend API key** — `RESEND_API_KEY` missing; transactional emails disabled.
3. **Roadmap Fase 2** — analytics, 24h reminders, visual calendar, customer history, export CSV/PDF not started.

## Environment Notes
- Repo on branch `main` synced with `origin/main`. Working tree contains local operational files (`AGENTS.md`, `SOUL.md`, etc.) tracked as untracked changes.
- `.env` currently populated with Neon/Postgres + OpenAI + MercadoPago secrets. No Resend vars.
- Production diagnostics endpoints not defined; local health verified via build + lint.

## Next Immediate Actions
- Follow CLAUDE 8-step workflow for each task.
- Refresh MercadoPago credentials + validate `/api/settings/billing` checkout flow.
- Add `RESEND_API_KEY` env variable (+ integration tests for emails).
- Begin Fase 2 feature work after billing/email infrastructure stabilized.
