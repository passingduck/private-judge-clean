# Supabase Usage

Common local commands (via npx supabase):

- Start local stack: `npm run supabase:start`
- Status: `npm run supabase:status`
- Stop: `npm run supabase:stop`
- Apply migrations: `npm run supabase:db:push`
- Serve Edge Functions: `npm run supabase:functions:serve`

Project files:
- Config: `supabase/config.toml`
- Migrations: `supabase/migrations/*.sql`
- Seed: `supabase/seed.sql`
- Functions: `supabase/functions/*/index.ts`

Notes:
- The CLI may require network to download containers and dependencies the first time.
- Ensure Docker is running for local services.
