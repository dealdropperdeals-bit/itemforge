# VPS Launch Checklist

## 1. Provision the server

- Ubuntu 24.04 VPS
- Point your domain A record to the VPS IP
- Open ports 80 and 443

## 2. Install runtime

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

## 3. Upload the app

```bash
scp -r ./case-creator user@your-vps:/srv/case-creator
ssh user@your-vps
cd /srv/case-creator
cp .env.example .env
```

## 4. Fill production env values

Set these before first start:

- `APP_URL=https://itemforge.app`
- `APP_DOMAIN=itemforge.app`
- `DATABASE_URL=postgresql://postgres:strong-password@db:5432/case_creator?schema=public`
- `AUTH_SECRET=long-random-string`
- `DATA_ENCRYPTION_KEY=another-long-random-string`
- PayPal live credentials and tier plan IDs
- PayPal one-time credit pack product IDs
- `PRINTIFY_SYNC_API_TOKEN` for daily allowlist sync
- OpenAI API key
- `ADMIN_EMAILS=founder@itemforge.app`

## 5. Start the stack

```bash
docker compose up -d --build
```

The app container runs `npm run db:push && npm run start` on boot.

## 6. Seed plans and profiles

```bash
docker compose exec app npm run db:seed
docker compose exec app npm run sync:printify
```

## 7. Bootstrap the first admin

```bash
BOOTSTRAP_ADMIN_EMAIL=founder@itemforge.app \
BOOTSTRAP_ADMIN_PASSWORD='replace-this-now' \
docker compose exec app npm run bootstrap:admin
```

## 8. Verify the live system

- Visit `https://itemforge.app/api/health`
- Create a beta account
- Start a PayPal subscription
- Confirm PayPal webhook hits `/api/paypal/webhook`
- Save a Printify token and shop ID from `/dashboard`
- Upload a design in `/dashboard`
- Prepare exports and download the ZIP bundle
- Call the OpenAI route and confirm credits decrease

## 9. Launch-safe rollback

If billing or AI is unstable:

- Hide the AI plan in the dashboard
- Keep memberships live but post credits manually in the ledger if needed
- Freeze the Printify allowlist and skip automatic sync until verified
