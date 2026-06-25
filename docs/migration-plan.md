# PhotoLancer — Cloud Migration & Cost-Minimization Plan

**Goal:** Move PhotoLancer off **Lovable Cloud** (which resells Supabase with a credit/usage
markup) onto infrastructure you control, optimized for the **lowest predictable cost** as the
user base grows.

**Chosen direction:** self-hosted Supabase on your **Hostinger KVM VPS** + **Cloudflare R2 + CDN**
for images + **Cloudflare Pages** for the frontend.

> ⚠️ **Before starting Phase 1, confirm VPS specs** (see "Prerequisites"). Self-hosted Supabase
> needs meaningful RAM; the plan assumes ≥ 4 GB (8 GB strongly recommended for headroom).

---

## 1. Current vs. target architecture

| Layer            | Now (Lovable Cloud)                          | Target (self-owned)                                  |
| ---------------- | -------------------------------------------- | ---------------------------------------------------- |
| Frontend host    | Lovable                                       | Cloudflare Pages (free tier)                          |
| Database         | Supabase via Lovable (markup)                 | Self-hosted Postgres (Supabase stack) on Hostinger VPS|
| Auth             | Supabase Auth + `@lovable.dev/cloud-auth-js`  | Native Supabase Auth (GoTrue)                          |
| Edge functions   | Supabase Edge Functions via Lovable           | Self-hosted Supabase Edge Runtime (Deno) on the VPS   |
| File/image storage | Supabase Storage (egress billed)            | **Cloudflare R2 (zero egress) + CDN/Image resizing**  |
| Payments         | Razorpay                                       | Razorpay (your own keys) — unchanged                  |
| Email            | Resend                                         | Resend (your own key) — unchanged                     |
| Stock photos     | Pexels / Unsplash                             | Pexels / Unsplash (your own keys) — unchanged         |

**Lock-in is minimal.** The only Lovable-specific code is the thin OAuth wrapper
(`src/integrations/lovable/index.ts`, which just calls `supabase.auth.setSession()`) and the
Vite preset (`@lovable.dev/vite-tanstack-config`). Everything else is standard Supabase + React.

---

## 2. Why this stack (the cost reasoning)

- **Hostinger VPS over AWS:** fixed monthly price and included bandwidth = *predictable* cost.
  AWS bills usage and charges expensive egress — the worst pricing model for a photo platform.
- **Cloudflare R2 over Supabase Storage:** R2 has **no egress fees**. For a platform serving many
  images to many users, egress is the #1 cost driver — this single choice saves the most at scale.
- **Cloudflare Pages over a Node host:** static/SSR frontend served from Cloudflare's edge, free
  tier covers a lot, and it sits naturally next to R2.

---

## 3. Prerequisites (do these first)

1. **Confirm VPS specs** — RAM, vCPU, disk, OS. Share the Hostinger panel screenshot.
   - Minimum: 2 vCPU / 4 GB RAM / 50 GB disk. Recommended: 4 vCPU / 8 GB / 100 GB+.
   - If RAM < 4 GB, upgrade the plan before self-hosting Supabase.
2. **A domain name** pointed at Cloudflare (move DNS to Cloudflare — free, and required for R2/CDN).
3. **Your own accounts/keys:** Supabase CLI, Razorpay, Resend, Pexels, Unsplash, Cloudflare.
4. **SSH access** to the VPS with a non-root sudo user; firewall (ufw) enabled.

---

## 4. Migration phases

Each phase is independently shippable. Do them in order; don't start the next until the current
one is verified.

### Phase 0 — Repo ready ✅ (done)
- PhotoLancer imported into the repo (PR #1), secrets excluded, `.env.example` added.

### Phase 1 — Self-host Supabase on the VPS
1. Install Docker + Docker Compose on the VPS.
2. Clone the official Supabase self-host stack (`supabase/docker`).
3. Generate strong secrets: `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`,
   dashboard credentials.
4. Put Postgres on a dedicated volume; configure automated backups (daily `pg_dump` to R2).
5. Put the stack behind a reverse proxy (Caddy/Nginx) with HTTPS (Let's Encrypt) on a subdomain,
   e.g. `api.yourdomain.com`.
6. Lock down: firewall so only 80/443 (and SSH) are public; Postgres port NOT exposed.

### Phase 2 — Apply schema + migrate data
1. Link the Supabase CLI to the self-hosted instance.
2. Apply all 32 migrations from `supabase/migrations/` (they're standard SQL — portable).
3. Export existing data from the Lovable-managed Supabase (`pg_dump`) and import into the VPS DB.
4. Re-create storage buckets (these will move to R2 in Phase 4).
5. Verify row-level security (RLS) policies came across and behave correctly.

### Phase 3 — Deploy edge functions + wire secrets
1. Deploy all 14 functions in `supabase/functions/` to the self-hosted Edge Runtime.
2. Set function secrets on the VPS (never in the frontend):
   `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RESEND_API_KEY`,
   `PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY`, `APP_URL`.
3. Smoke-test each function (payments → escrow → release flow especially).

### Phase 4 — Move images to Cloudflare R2 + CDN (biggest cost win)
1. Create an R2 bucket; enable a public CDN domain (e.g. `cdn.yourdomain.com`) in front of it.
2. Update upload paths (frontend + relevant edge functions) to write to R2 via S3-compatible API.
3. Update read/display paths to serve from the CDN domain.
4. Add image resizing/optimization at the edge (Cloudflare Images or transform rules) so you don't
   ship full-resolution originals to every viewer.
5. Migrate existing objects from Supabase Storage → R2 (one-time copy script).

### Phase 5 — Replace Lovable auth wrapper
1. Replace `@lovable.dev/cloud-auth-js` usage with native Supabase OAuth
   (`supabase.auth.signInWithOAuth(...)`).
2. Configure OAuth providers (Google/Apple/Microsoft) directly in self-hosted GoTrue.
3. Remove the `src/integrations/lovable/` directory and the dependency.

### Phase 6 — Deploy the frontend
1. Swap `@lovable.dev/vite-tanstack-config` for a standard TanStack Start + Vite config (or keep it
   if it still builds cleanly — verify first).
2. Set frontend env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) to the VPS endpoints.
3. Deploy to Cloudflare Pages; point `yourdomain.com` at it.

### Phase 7 — Cutover & decommission
1. DNS cutover to the new stack; monitor errors/logs for 24–48h with Lovable still available as
   fallback.
2. Once stable, stop the Lovable Cloud subscription.

---

## 5. Rough monthly cost picture (early scale)

| Item                         | Estimated cost                                  |
| ---------------------------- | ----------------------------------------------- |
| Hostinger KVM VPS            | Fixed, ~few $/mo (already owned)                 |
| Cloudflare R2 storage        | ~$0.015/GB stored, **$0 egress**                |
| Cloudflare Pages + CDN       | Free tier covers early scale                     |
| Razorpay / Resend / Pexels   | Pay-per-use / free tiers; no platform markup     |
| **vs. Lovable Cloud**        | removes the credit/usage markup entirely         |

The win compounds as users grow: VPS cost stays flat, and image egress (the part that would balloon
on Lovable/AWS/Supabase egress) is ~free on R2.

---

## 6. Risks & operational reality (read before committing to self-host)

Self-hosting trades money for **operational responsibility**. You now own:

- **Backups** — automated daily DB dumps off-box (to R2), and *test restores*.
- **Uptime** — a single VPS is a single point of failure. Plan monitoring/alerts; consider a
  standby for critical scale.
- **Security patching** — OS + Docker images kept current.
- **Scaling Postgres** — vertical (bigger VPS) is easy; horizontal needs planning later.

**Lower-risk alternative if ops becomes a burden:** a managed Supabase project (your own account)
removes most of the Lovable markup with none of the ops work. You can start managed and self-host
later, or run self-hosted with managed as a documented fallback. Keep this option open.

---

## 7. Immediate next actions

1. **You:** share the Hostinger VPS specs screenshot → I confirm sizing.
2. **You:** confirm you have/can create the provider accounts in §3.
3. **Me:** once specs are confirmed, I'll turn Phase 1–3 into concrete scripts/configs committed to
   the repo (Docker Compose, Caddy config, backup cron, deploy steps).
