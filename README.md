# iesales.ie

Free, ad-free, community-reported Irish Black Friday deal tracker. Installable PWA.
Next.js 16 (App Router) + Tailwind 4 + Supabase (Postgres, Auth, Storage) on Vercel.

Without Supabase keys the app runs in **labelled demo mode** (fictional shops, in-memory data) so you can
click through everything on `npm run dev`.

## Run locally
```bash
npm install
cp .env.example .env.local   # leave the Supabase values empty for demo mode
npm run dev
```

## Go live: step by step (about 30 minutes)

### 1. Supabase
1. Create a project at database.new. **Region: West EU (Ireland)**. For launch week use the Pro plan: the free tier
   pauses inactive projects and has low connection and email limits.
2. SQL Editor, paste all of `supabase/schema.sql`, Run. It is safe to re-run.
3. Project Settings, API: copy the **Project URL** and the **anon/publishable key** (never the service-role key).

### 2. Google sign-in
1. Google Cloud Console, APIs & Services, OAuth consent screen (External; app name iesales.ie; add your support email).
2. Credentials, Create OAuth client ID, type **Web application**. Authorised redirect URI:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Supabase, Authentication, Sign In / Providers, **Google**: paste the client ID and secret, enable.
4. Supabase, Authentication, URL Configuration:
   - Site URL: `https://iesales.ie`
   - Redirect URLs: `https://iesales.ie/auth/callback`, `https://*.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`

### 3. Email magic link (optional second login)
Supabase's built-in email sender is limited to a handful of emails per hour. If you keep magic links, configure
custom SMTP (Authentication, Emails, SMTP Settings) with a provider such as Resend. Google sign-in does not need it.
Also enable CAPTCHA (Authentication, Attack Protection) to slow bot sign-ups.

### 4. Vercel
1. Import the repo (or run `npx vercel --prod`). `vercel.json` pins functions to Dublin (`dub1`), next to Supabase.
2. Environment variables (Production and Preview):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from step 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 1 |
| `NEXT_PUBLIC_SITE_URL` | `https://iesales.ie` |
| `NEXT_PUBLIC_OPERATOR_NAME` | legal name of who runs the site (shown in Terms and Privacy) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | a mailbox you actually monitor (takedowns, GDPR requests) |
| `NEXT_PUBLIC_OPERATOR_ADDRESS` | postal address of the operator (legally required on the site) |
| `OPENROUTER_API_KEY` | enables Auto-fill from a pasted link (see below). Server-side only, set a spend limit on the key |

3. Settings, Domains: add `iesales.ie` and set the DNS records Vercel shows. Do **not** enable Vercel Analytics or
   Speed Insights (the Zero-Profit Pledge promises no tracking).

### 5. Make yourself the editor/moderator
Sign in once, then in the Supabase SQL Editor:
```sql
insert into public.moderators (user_id)
select id from auth.users where email = 'you@example.com' on conflict do nothing;
```
Your deals now carry the public **Editor** badge, and `/admin` shows the review queue (hidden posts, new photos
awaiting approval, takedown notices).

## Auto-fill from a link (OpenRouter)
When a signed-in shopper pastes a shop link in "Post a deal", `/api/enrich` calls OpenRouter's Responses API with
`anthropic/claude-haiku-5.5` for links (and `google/gemini-3.8-flash` for price-tag photos) plus the `openrouter:web_fetch` tool (reads that one page) and the `openrouter:web_search`
tool (looks for the same product at other Irish shops). It fills product, brand, shop, category, price and promo code,
shows other Irish prices with links, and warns (never blocks) if the shopper's price differs from the page by more than 10%.
- Safeguards: https public links only; sign-in required; 12 reads per user per hour and a daily cap; 15-minute cache; output
  validated (category list, price range, comparison links must come from real search results); page text is treated as untrusted.
- Cost: roughly 1 fetch + 1 search (about $0.01 per read at the documented rates) plus a few thousand tokens. Set a spend limit on the key.
- Privacy: only the pasted link leaves the site (disclosed in the privacy text). Do not store page text.
- Without the key the feature quietly says it is unavailable and the form works by hand.

## Before you share the link
- [ ] Set `NEXT_PUBLIC_OPERATOR_NAME` and `NEXT_PUBLIC_CONTACT_EMAIL`. Have a solicitor read the Terms and Privacy text in
      `src/components/modals/LegalModals.tsx` (it is a draft, not legal advice).
- [ ] Sign in with Google on the live site, post a deal, vote, delete the deal, then test **Delete my account**.
- [ ] Open `/admin` as moderator. Flag a test post from 5 older accounts and confirm it hides.
- [ ] Seed only deals you have checked yourself, with a link or photo as evidence, under your own labelled editor account.
- [ ] Plan who reviews `/admin` and the takedown mailbox on Thursday and Friday.

## How it is built (and why)
| Concern | Pattern |
|---|---|
| Traffic spikes | Home page is ISR (rebuilt every 15s). `/api/feed` is an aggregated read model cached at the CDN (`s-maxage=15`, `stale-while-revalidate`, `stale-if-error=86400`), so database load stays flat however many visitors arrive, and the last good copy keeps serving if Supabase is down. |
| No realtime sockets | Clients poll the cached feed (30-50s, jittered, paused in hidden tabs). Realtime connection limits would be the first thing to break in a spike. |
| Fast reads | Counters (votes, comments) are maintained by triggers at write time (no `COUNT()` on read). Partial indexes match the feed query (0.8 ms for 120 rows over 50,000 deals). |
| Ranking | Hot rank = Wilson-score lower bound (small samples cannot spike) x engagement / time decay (HN/Reddit gravity form). |
| Read-your-writes | Votes apply optimistically and are replayed over any older CDN snapshot; snapshots are monotonic (an older response never overwrites a newer one). |
| Idempotency | Deals use a client-generated UUID, so a retried submit cannot create a duplicate. Unique constraints stop double votes and double reports. |
| Abuse resistance | Per-user rate limits in the database; flags from accounts under 1 hour old carry no weight; counters, `is_hidden` and photo approval are writable only by server-side functions (column-level grants). |
| Duplicates | New posts are checked against current deals by normalised URL and token-set Jaccard similarity. |
| Offline | Service worker: app shell, stale-while-revalidate feed, friendly offline page. |

Database behaviour is covered by `supabase/tests/` (about 120 checks, run against a real Postgres 16).

## Not verified here
This was built and tested in a sandbox without access to your Supabase, Google or Vercel accounts. Verified: production build,
lint, type-check, the database schema and security rules on local Postgres, and a full browser run in demo mode at 320/375/768/1440px.
**Not verified:** Google OAuth round-trip, magic-link email delivery, photo upload to Supabase Storage, and behaviour under real load.
Test these on your deployed site before launch.
