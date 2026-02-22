# Supabase Configuration — BIS Edge Quotation Dashboard

## Authentication Rate Limiting

Configure in Supabase Dashboard > Authentication > Rate Limits:

| Setting | Value | Purpose |
|---------|-------|---------|
| Rate limit for sign-in | 5 per minute per IP | Brute-force protection |
| Rate limit for sign-up | 5 per hour per IP | Abuse prevention |
| Rate limit for token refresh | 30 per minute | Prevent token refresh storms |
| Rate limit for email sent | 5 per hour | Prevent email abuse |

### Verification

After configuring, verify brute-force protection:

1. Attempt 6 rapid failed logins from the same browser
2. The 6th attempt should return HTTP 429 (Too Many Requests)
3. Refresh the page — the lockout should persist (server-side enforcement)
4. Try from a different browser/device — same IP should be blocked
5. Wait 1 minute — attempts should succeed again

### Client-Side Layer

The app also has client-side rate limiting in `useAuthStore.ts` (`LOGIN_ATTEMPTS` Map) for instant UX feedback. This is a convenience layer — it does NOT provide security. The server-side Supabase Auth rate limiting is the enforcement layer.

## Realtime Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| Max channels per client | 100 (default) | Prevent connection exhaustion |
| Realtime max concurrent connections | Per plan tier | Monitor via Supabase dashboard |

## Database Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| Connection pooling | Enabled (PgBouncer) | Handle 200+ concurrent users |
| Pool mode | Transaction | Best for short-lived queries |
| Pool size | 25+ | Per Supabase Pro plan |
| Statement timeout | 30s (default) | Prevent long-running queries |

## Project Reference

- **Project ID:** `padeaqdcutqzgxujtpey`
- **Region:** Check Supabase dashboard
- **Plan:** Pro recommended for 200+ users (connection pooling, pg_cron, higher limits)
