#!/usr/bin/env node
const { createServer } = require('./_mcp-core');

const PROCEDURE = [
  'agenda_negotiation',
  'claims_submission',
  'debate_round_1',
  'debate_round_2',
  'debate_final',
  'judge_decision',
  'jury_batch',
  'report_finalize'
];

createServer({
  name: 'context7-mcp',
  version: '0.1.0',
  tools: [
    {
      name: 'procedure_spec',
      description: 'Return the structured debate flow steps.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run: async () => ({ name: 'debate_flow', steps: PROCEDURE })
    },
    {
      name: 'procedure_run',
      description: 'Simulate or trigger the debate flow via API endpoints.',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: { type: 'string' },
          dryRun: { type: 'boolean' }
        },
        required: ['roomId'],
        additionalProperties: false
      },
      run: async ({ roomId, dryRun = true }) => {
        const results = [];
        for (const step of PROCEDURE) {
          if (dryRun) {
            results.push({ step, action: 'SKIPPED (dry run)' });
            continue;
          }
          try {
            // Minimal placeholders; in non-dry mode, we could call our app APIs.
            // e.g., fetch(`/api/rooms/${roomId}/debate/start`, { method: 'POST' })
            results.push({ step, action: 'INVOKED', ok: true });
          } catch (e) {
            results.push({ step, action: 'ERROR', error: e.message });
            break;
          }
        }
        return { roomId, results };
      }
    }
  ]
});
