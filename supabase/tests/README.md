# Database tests

These run `supabase/schema.sql` against a throwaway local Postgres (with stand-ins for Supabase's
`auth`/`storage` schemas and roles) and attack it as anonymous, normal, moderator and hostile users.

```bash
createdb iesales_test
psql -d iesales_test -f supabase/tests/00_supabase_stub.sql
psql -d iesales_test -f supabase/schema.sql          # run twice to prove it is idempotent
psql -d iesales_test -f supabase/tests/10_security_tests.sql   # ~120 checks, ends with ALL SECURITY TESTS PASSED
psql -d iesales_test -f supabase/tests/20_perf.sql             # 50k-row feed query timing
```

Do not run these against your real Supabase project: they create roles and schemas.
