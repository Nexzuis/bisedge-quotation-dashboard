# Deployment Checklist — BIS Edge Quotation Dashboard

## Pre-Deployment: Supabase Migrations

Run these in order via Supabase SQL Editor or `supabase db push`:

1. **RLS Policies** — `supabase/migrations/001_rls_policies.sql`
   - Enables Row-Level Security on all 10 core tables
   - Test thoroughly: verify sales reps can only see their own quotes
   - Test admin users retain full access

2. **Schema & RPCs** — `supabase/migrations/002_schema_and_rpcs.sql`
   - Adds `quotes_status_check` constraint
   - Adds `updated_by` column to `quotes`
   - Creates `quote_ref_seq` sequence
   - Creates `generate_next_quote_ref()` and `save_quote_if_version()` RPCs

3. **Atomic Saves** — `supabase/migrations/003_atomic_saves.sql`
   - Creates `save_commission_tiers_atomic()` and `save_residual_curves_atomic()` RPCs

4. **Presence Cleanup** — `supabase/migrations/004_presence_cleanup.sql`
   - Creates `cleanup_stale_presence()` function
   - Schedules via `pg_cron` (if available on plan)

## Edge Function Deployment

```bash
# Deploy admin user creation function
supabase functions deploy admin-create-user --project-ref padeaqdcutqzgxujtpey

# Verify deployment
supabase functions list
```

Required secrets for the Edge Function:
- `SUPABASE_SERVICE_ROLE_KEY` — set via Supabase dashboard > Edge Functions > Secrets

## SMTP Configuration

Configure in Supabase Dashboard > Authentication > Email Templates > SMTP Settings:

| Setting | Recommended Value |
|---------|------------------|
| Provider | Resend, SendGrid, or Postmark |
| Sender email | `noreply@bisedge.co.za` (or your domain) |
| SMTP Host | Per provider documentation |
| SMTP Port | 587 (TLS) |
| Username | Per provider API key |
| Password | Per provider API key |

Test by triggering a password reset email from the app.

## Vercel Environment Variables

Verify these are set in Vercel > Project Settings > Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://padeaqdcutqzgxujtpey.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Production anon key (not service role) |

Ensure NO development/staging keys are present in production.

## Connection Pooling

For 200+ concurrent users:
1. Supabase Dashboard > Database > Connection Pooling
2. Enable PgBouncer
3. Set pool mode to `transaction`
4. Set pool size to at least 25 (Supabase Pro default)

## Post-Deployment Verification

- [ ] App loads at production URL
- [ ] Login works (test with a real user account)
- [ ] Create a new quote → save → verify it persists
- [ ] Admin panel loads → create a test user
- [ ] Trigger a password reset email → verify delivery
- [ ] Check browser console for errors (should be clean)
- [ ] Verify security headers (`X-Frame-Options`, CSP) via browser DevTools
