# LeadDoor VPS Deploy Checklist

Architecture: **Vercel** (web + API + webhooks) + **your VPS** (Postgres + Redis + DM worker).
Monthly extra cost: ₹0 — VPS already iruku.

## Part 1 — VPS prep (one time)

```bash
# Docker install (Ubuntu)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # then logout/login

# Node 20 + PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

## Part 2 — Postgres + Redis on VPS

```bash
cd ~/lead-door
export POSTGRES_PASSWORD='<strong-password>'
export REDIS_PASSWORD='<strong-password>'
docker compose -f docker-compose.vps.yml up -d
docker compose -f docker-compose.vps.yml ps   # both "healthy"
```

Save these two passwords — Part 3/5-la thevai.

Connection strings (worker-ku):
- `DATABASE_URL=postgresql://leaddoor:<POSTGRES_PASSWORD>@127.0.0.1:5432/leaddoor`
- `REDIS_URL=redis://:<REDIS_PASSWORD>@127.0.0.1:6379`

## Part 3 — DM worker on VPS (PM2)

```bash
cd ~
git clone https://github.com/balachander1594-cyber/instagram-comment-to-dm.git lead-door
cd lead-door
npm ci
cp .env.example .env
# .env-la fill pannunga: DATABASE_URL, REDIS_URL (Part 2), NEXTAUTH_SECRET,
# CRON_SECRET, ENCRYPTION_KEY (openssl rand -hex 32), RESEND_API_KEY,
# EMAIL_FROM, STRIPE_*, META_* (Part 6), WEBHOOK_VERIFY_TOKEN

npm run db:generate
npm run db:migrate        # tables create aagum

pm2 start npm --name leaddoor-worker -- run worker
pm2 save && pm2 startup   # reboot-nalum auto start
pm2 logs leaddoor-worker  # "worker ready" nu varaNum
```

## Part 4 — Vercel web deploy

1. Vercel → New Project → `balachander1594-cyber/instagram-comment-to-dm` import
2. Environment variables: `.env` ile irundha ella values-um add pannunga
   - `NEXTAUTH_URL` = unga Vercel domain (e.g. `https://lead-door.vercel.app`)
   - `DATABASE_URL` = VPS public IP oda string:
     `postgresql://leaddoor:<pw>@<VPS-IP>:5432/leaddoor`
     (VPS firewall-la 5432-a unga Vercel-ku mattum allow pannunga, illa SSH tunnel use pannunga)
   - `REDIS_URL` — worker-ku mattum thevai; Vercel-ku optional
3. Deploy → domain note pannunga

> Note: Vercel-lerundhu VPS Postgres-a reach panna, VPS firewall-la port 5432 open pannanum.
> Safer option: VPS-la Tailscale/Cloudflare Tunnel. Simple option: firewall-la Vercel IPs allow.

## Part 5 — Meta App (critical path — parallel-a start pannunga)

`META_APP_REVIEW.md`-la full steps iruku. Summary:

1. [developers.facebook.com](https://developers.facebook.com) → Create App (Business type)
2. Add products: **Instagram Graph API** + **Webhooks**
3. Webhook callback URL: `https://<vercel-domain>/api/webhook`
   Verify token: unga `WEBHOOK_VERIFY_TOKEN`
   Subscribe fields: `comments`, `messages`
4. App Review-ku apply: `instagram_manage_comments`, `instagram_manage_messages`
   (test user-a add panni demo video kudunga — doc-la template iruku)
5. Approval vandhadum: App ID + secrets-a Vercel + VPS `.env`-la podunga

## Part 6 — Stripe

1. Stripe Dashboard → Products → monthly prices: **Pro** ₹999/mo, **Agency** ₹1,999/mo
2. Price IDs-a `STRIPE_PRICE_PRO` / `STRIPE_PRICE_AGENCY`-la podunga
3. Webhook endpoint: `https://<vercel-domain>/api/stripe/webhook`
   Events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`

## Part 7 — Verify checklist

- [ ] `https://<vercel-domain>/api/health` → 200
- [ ] Login (magic link email varudha?)
- [ ] Instagram connect flow
- [ ] Test keyword campaign: comment → DM within seconds
- [ ] `pm2 logs` la errors illa
- [ ] Stripe test checkout

## Weekly maintenance

- `pm2 logs leaddoor-worker --lines 50` — errors check
- VPS disk: `df -h` (Postgres data grow aagum)
- Meta token refresh: Vercel Cron automatic (`/api/cron/refresh-tokens`)
