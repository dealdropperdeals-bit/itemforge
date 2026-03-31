# Case Creator Beta Launch Blueprint

## Final Product Decision

- One core SaaS product
- Tiered memberships for the same product
- AI generation included in the product
- Logging included in the product
- Crossposting included in the product
- Usage controlled by credits
- Extra credits sold as separate add-on packs

## Recommended Stack

- App: Next.js 16 App Router with TypeScript
- Database: PostgreSQL 16
- ORM: Prisma
- Auth: Auth.js credentials
- Billing: PayPal subscriptions for memberships
- Credits: DB-backed ledger
- POD provider: Printify only at launch
- Image processing: Sharp
- AI: OpenAI server-side only
- Storage: local VPS disk
- Deployment: Docker Compose on one VPS with Caddy

## Launch MVP Scope

Ship now:

- Signup and login
- Membership tiers for the same product
- Credit balance tracking
- PayPal subscription start flow
- PayPal webhook reconciliation
- Monthly credit allocation on active subscription
- User-supplied Printify token and shop ID storage
- Curated Amazon-candidate Printify allowlist
- Daily Printify catalog and pricing sync from server-side API calls
- Pricing, cost, and target margin visibility in the app
- Design upload and Printify-ready export generation
- Idea generation and structured job spec generation through credits
- Job spec persistence for workstation handoff

Postpone:

- Printify OAuth
- Multiple POD providers
- Fully automated crossposting publishing flows
- Fine-grained per-token AI billing
- Complex workstation desktop integration
- Team accounts and permissions

## Database Shape

Core launch tables:

- `User`
- `SubscriptionPlan`
- `UserSubscription`
- `CreditPack`
- `CreditLedgerEntry`
- `PrintifyConnection`
- `DeviceProfile`
- `Design`
- `DesignExport`
- `JobSpec`
- `AiUsageEvent`
- `WebhookEvent`

## Billing Model

Memberships:

- `launch-starter`: $29/month, 150 credits
- `launch-growth`: $79/month, 600 credits
- `launch-pro`: $149/month, 1500 credits

Credit packs:

- `credits-100`: $15 one-time
- `credits-500`: $60 one-time

Launch credit costs:

- Idea generation: 1 credit
- Structured job spec generation: 2 credits
- Crossposting prep: 1 credit

## PayPal Flow

### Memberships

1. User signs in.
2. User selects a membership tier.
3. Server creates a PayPal subscription.
4. User approves on PayPal.
5. Webhook arrives.
6. Server fetches the subscription from PayPal.
7. `UserSubscription` is updated.
8. If active, the app posts monthly credits into `CreditLedgerEntry`.

### Credit packs

1. Create one-time PayPal checkout buttons or orders for packs.
2. Server creates a PayPal order for the selected pack.
3. User approves on PayPal.
4. Return route captures the order.
5. App posts a positive credit ledger entry.

## Printify Model

Launch choice:

- Each user supplies a Personal Access Token and `shop_id`
- Server stores the token encrypted
- OAuth is postponed

App-global catalog strategy:

- Maintain a curated allowlist JSON for Amazon-candidate items
- Run one daily sync using a service token in `PRINTIFY_SYNC_API_TOKEN`
- Refresh blueprint and variant cost data
- Upsert into `DeviceProfile`

## Pricing and Margin Logic

For each supported item:

- Store `baseCostCents`
- Store `suggestedPriceCents`
- Store `targetMarginPct`
- Compute margin from synced cost data
- Show only curated Amazon-candidate items first

## Workstation Handoff Model

1. User generates an idea or structured job spec.
2. The app stores the spec in `JobSpec`.
3. Workstation software consumes the spec.
4. Final outputs return to the app through the handoff contract.

For launch, the app only needs to own the spec structure and status tracking.

## Environment Variables

- `APP_URL`
- `APP_DOMAIN`
- `DATABASE_URL`
- `AUTH_SECRET`
- `PAYPAL_ENV`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_PLAN_ID_STARTER`
- `PAYPAL_PLAN_ID_GROWTH`
- `PAYPAL_PLAN_ID_PRO`
- `PAYPAL_CREDIT_PACK_ID_100`
- `PAYPAL_CREDIT_PACK_ID_500`
- `PRINTIFY_SYNC_API_TOKEN`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `DATA_ENCRYPTION_KEY`
- `STORAGE_ROOT`
- `MAX_UPLOAD_MB`
- `ADMIN_EMAILS`

## Repo Structure

```text
case-creator/
  data/
    printify-allowlist.json
  docs/
  prisma/
  scripts/
    bootstrap-admin.ts
    sync-printify-catalog.ts
  src/
    app/
      api/
      dashboard/
      sign-in/
      sign-up/
    lib/
  Dockerfile
  docker-compose.yml
```

## 12-Hour Execution Order

### Hour 1

- Finalize domain, VPS, and pricing
- Create PayPal subscription plans
- Create PayPal one-time credit pack products

### Hour 2

- Fill `.env`
- Start Postgres
- Run Prisma generate and schema push
- Seed plans, packs, and allowlist data

### Hour 3

- Bootstrap the first admin
- Validate signup and login

### Hour 4

- Validate membership checkout start flow
- Point PayPal webhooks to production path

### Hour 5

- Confirm webhook reconciliation and monthly credit posting

### Hour 6

- Validate encrypted Printify connection save
- Run `npm run sync:printify`

### Hour 7

- Upload artwork
- Prepare exports
- Confirm pricing and margin display

### Hour 8

- Test OpenAI generation with credit deductions
- Test job spec storage

### Hour 9

- Push to VPS
- Build and start containers

### Hour 10

- Validate health check, auth, billing, Printify connection, and exports on production

### Hour 11

- Run a controlled beta test with 1-3 users
- Fix only blockers

### Hour 12

- Open beta
- Keep a manual fallback for credit pack posting and subscription verification

## Fast Fallbacks

- If PayPal credit packs slow launch: ship memberships first and add credits manually after payment
- If Printify sync is unstable: freeze the curated allowlist and sync once manually
- If workstation return flow is not ready: ship spec generation and status tracking only
- If AI cost feels risky: reduce credits included per tier, not feature access
