# MCP Setup

This project includes three local MCP servers for development:

- supabase-local: database schema inspection and policy checks
- playwright-local: basic E2E flows and screenshots
- context7-local: sequential debate-flow orchestration (dry-run by default)

## Configuration

The MCP servers are declared in `.cursor/mcp.json` so that Cursor or MCP-capable clients can discover and run them.

## Commands

- Run Supabase MCP: `npm run mcp:supabase`
- Run Playwright MCP: `npm run mcp:playwright`
- Run Context7 MCP: `npm run mcp:context7`

## Tools

- supabase-local
  - db_schema_summary: summarize schema from `supabase/migrations` files
  - rls_policy_check: extract RLS-related statements for review
  - cli_status: attempts `npx supabase status` (if CLI available)
  - seed_preview: previews `supabase/seed.sql`
  - functions_list: lists edge functions

- playwright-local
  - e2e_flow: runs a minimal flow (room-create | disconnect-reconnect) and saves screenshots to `.playwright-mcp/`

- context7-local
  - procedure_spec: returns the debate-flow steps
  - procedure_run: simulates triggering each step (dry run by default)

## Notes

- These servers are minimal and designed for local development without network installs.
- For full Supabase CLI usage, ensure `npx supabase` is available (may require network access to install).
- Ensure the Next.js dev server runs on `http://localhost:3000` for Playwright flows.
