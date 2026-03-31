# Coolify Launch Runbook

## 1. DNS

Required record:

- `A` `@` -> `YOUR_VPS_IPV4`

Optional only if you want it:

- `CNAME` `www` -> `itemforge.app`

## 2. Coolify install

On the VPS:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Then open:

```text
http://YOUR_VPS_IP:8000
```

Finish the Coolify setup UI, then add the server if it is not already present.

## 3. Coolify setup order

1. Push the app code to a Git repo Coolify can access.
2. In Coolify create a new project named `itemforge`.
3. Create a new environment named `production`.
4. Create a PostgreSQL resource in that environment.
5. Copy the internal Postgres connection string.
6. Create a new application from the Git repo.
7. Select Dockerfile-based deployment.
8. Add one persistent storage mount:
   - source: Coolify persistent storage
   - destination: `/app/storage`
9. Set domain to `itemforge.app`.
10. Add the env vars below.
11. Deploy once.
12. Open the application terminal and run the one-time setup commands below.

## 4. Production env vars

Required:

- `APP_NAME=Case Creator`
- `NODE_ENV=production`
- `APP_URL=https://itemforge.app`
- `APP_DOMAIN=itemforge.app`
- `DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@YOUR_COOLIFY_DB_HOST:5432/case_creator?schema=public`
- `AUTH_SECRET=LONG_RANDOM_STRING`
- `NEXTAUTH_URL=https://itemforge.app`
- `PAYPAL_ENV=live`
- `PAYPAL_CLIENT_ID=...`
- `PAYPAL_CLIENT_SECRET=...`
- `OPENAI_API_KEY=...`
- `OPENAI_MODEL=gpt-5.1`
- `PRINTIFY_SYNC_API_TOKEN=...`
- `STORAGE_ROOT=/app/storage`
- `MAX_UPLOAD_MB=25`
- `DATA_ENCRYPTION_KEY=LONG_RANDOM_STRING`
- `ADMIN_EMAILS=founder@itemforge.app`

Fastest path:

- copy values from `.env.production.example`

Required for billing plans:

- `PAYPAL_PLAN_ID_STARTER=...`
- `PAYPAL_PLAN_ID_GROWTH=...`
- `PAYPAL_PLAN_ID_PRO=...`

Optional for later webhook signature verification or DB metadata:

- `PAYPAL_WEBHOOK_ID=...`
- `PAYPAL_CREDIT_PACK_ID_100=...`
- `PAYPAL_CREDIT_PACK_ID_500=...`

## 5. Database/setup commands

Run once in the Coolify application terminal after first deploy:

```bash
npm run db:push
npm run db:seed
npm run sync:printify
BOOTSTRAP_ADMIN_EMAIL=founder@itemforge.app BOOTSTRAP_ADMIN_PASSWORD='REPLACE_ME' npm run bootstrap:admin
```

## 6. PayPal live setup

In PayPal live:

1. Use or create the live REST app.
2. Create the live product for memberships.
3. Create the three live subscription plans.
4. Put those live plan IDs into Coolify env vars.
5. Add a live webhook pointing to:

```text
https://itemforge.app/api/paypal/webhook
```

Recommended events to subscribe:

- `BILLING.SUBSCRIPTION.CREATED`
- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.UPDATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `PAYMENT.SALE.COMPLETED`

## 7. PayPal live verification

1. Save env vars and redeploy.
2. Open `https://itemforge.app/dashboard`.
3. Start a real live subscription checkout.
4. Complete checkout.
5. Confirm the webhook call appears in PayPal webhook history as delivered.
6. Confirm the app DB has:
   - `UserSubscription` set to active
   - a positive `CreditLedgerEntry` for monthly allocation
7. Buy one credit pack.
8. Confirm return capture succeeds.
9. Confirm the ledger gets a positive `CREDIT_PACK_PURCHASE` entry.

## 8. Exact DB verification queries

Run against the production Postgres database:

```sql
select email, status, role from "User" order by "createdAt" desc limit 5;

select us."providerSubscriptionId", us.status, sp.code, sp.name, us."currentPeriodEnd"
from "UserSubscription" us
join "SubscriptionPlan" sp on sp.id = us."planId"
order by us."updatedAt" desc
limit 10;

select cle.kind, cle.delta, cle.description, cle."referenceKey", cle."createdAt"
from "CreditLedgerEntry" cle
order by cle."createdAt" desc
limit 20;

select "shopId", "shopName", "lastValidatedAt"
from "PrintifyConnection"
order by "updatedAt" desc
limit 10;

select title, status, "preparedPath", "previewPath", "exportedAt"
from "Design"
order by "updatedAt" desc
limit 10;

select title, status, "updatedAt"
from "JobSpec"
order by "updatedAt" desc
limit 10;
```

## 9. Live smoke test

1. `https://itemforge.app/api/health` returns 200.
2. Sign up with a fresh account.
3. Buy a membership.
4. Confirm credits appear.
5. Save a real Printify token and `shop_id`.
6. Upload one image.
7. Prepare exports.
8. Download the ZIP bundle.
9. Call AI generation once and confirm credits decrease.
10. Call job-spec generation and confirm the job spec record appears.

## 10. Fast fallback

If live credit-pack checkout is the only unstable piece:

- keep memberships live
- keep the credit pack buttons hidden
- post purchased credits manually in the ledger until checkout is stable
