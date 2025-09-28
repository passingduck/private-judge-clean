#!/usr/bin/env node
const { createServer } = require('./_mcp-core');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { ...opts, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout || '');
    });
  });
}

const repoRoot = path.resolve(__dirname, '../..');
const supaDir = path.join(repoRoot, 'supabase');

createServer({
  name: 'supabase-mcp',
  version: '0.1.0',
  tools: [
    {
      name: 'db_schema_summary',
      description: 'Summarize SQL schema from supabase/migrations/*.sql',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run: async () => {
        const migDir = path.join(supaDir, 'migrations');
        const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
        const out = [];
        for (const f of files) {
          const p = path.join(migDir, f);
          const sql = fs.readFileSync(p, 'utf8');
          const tables = [...sql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)/ig)].map(m => m[1]);
          const policies = [...sql.matchAll(/CREATE\s+POLICY\s+(\w+)/ig)].map(m => m[1]);
          out.push({ file: `supabase/migrations/${f}`, tables, policies });
        }
        return out;
      }
    },
    {
      name: 'rls_policy_check',
      description: 'List RLS-related statements and potential risks (static scan).',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run: async () => {
        const migDir = path.join(supaDir, 'migrations');
        const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
        const findings = [];
        for (const f of files) {
          const p = path.join(migDir, f);
          const sql = fs.readFileSync(p, 'utf8');
          const enableRLS = /ENABLE\s+ROW\s+LEVEL\s+SECURITY/ig.test(sql);
          const disableRLS = /DISABLE\s+ROW\s+LEVEL\s+SECURITY/ig.test(sql);
          const usingClauses = [...sql.matchAll(/USING\s*\(([^)]+)\)/ig)].map(m => m[1]);
          findings.push({ file: `supabase/migrations/${f}`, enableRLS, disableRLS, usingClauses });
        }
        return findings;
      }
    },
    {
      name: 'cli_status',
      description: 'Run `npx supabase status` to show local status (requires Supabase CLI).',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run: async () => {
        try {
          const out = await run('npx -y supabase status', { cwd: repoRoot });
          return out;
        } catch (e) {
          return `Supabase CLI not available or failed: ${e.message}`;
        }
      }
    },
    {
      name: 'seed_preview',
      description: 'Preview supabase/seed.sql content for review.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run: async () => {
        const p = path.join(supaDir, 'seed.sql');
        if (!fs.existsSync(p)) return 'No seed.sql found';
        const sql = fs.readFileSync(p, 'utf8');
        return sql.slice(0, 5000);
      }
    },
    {
      name: 'functions_list',
      description: 'List Edge Functions available under supabase/functions/.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run: async () => {
        const fDir = path.join(supaDir, 'functions');
        if (!fs.existsSync(fDir)) return [];
        const names = fs.readdirSync(fDir).filter(n => fs.statSync(path.join(fDir, n)).isDirectory());
        const files = names.map(n => ({ name: n, entry: `supabase/functions/${n}/index.ts` }));
        return files;
      }
    }
  ]
});
