# Case Creator

This repo is a fast-launch foundation for a single-app SaaS beta.

Start with:

1. Copy `.env.example` to `.env`
2. Run `npm install`
3. Bring up Postgres
4. Run `npm run db:generate`
5. Run `npm run db:push`
6. Run `npm run db:seed`
7. Run `npm run sync:printify` (full phone-case catalog sync: manufacturers, case models, phone models, costs, marketplace pricing)
8. Optional: run `npm run sync:printify:allowlist` for curated-only sync mode
9. Set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`
10. Run `npm run bootstrap:admin`
11. Run `npm run dev`

Primary launch runbook:

- `docs/launch-blueprint.md`
- `docs/vps-launch-checklist.md`
