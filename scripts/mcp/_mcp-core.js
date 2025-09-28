#!/usr/bin/env node
/**
 * Minimal MCP stdio JSON-RPC server core.
 * Provides a tiny framework to register tools and handle initialize/tools.list/tools.call.
 * Not a complete MCP implementation but sufficient for local use in Cursor-like clients.
 */
const readline = require('readline');

function createServer({ name, version, tools }) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");

  const toolMap = new Map();
  for (const t of tools) toolMap.set(t.name, t);

  rl.on('line', async (line) => {
    let req;
    try { req = JSON.parse(line); } catch { return; }
    const { id, method, params } = req;
    try {
      if (method === 'initialize') {
        send({ jsonrpc: '2.0', id, result: { serverInfo: { name, version } } });
      } else if (method === 'tools/list') {
        const list = tools.map(t => ({
          name: t.name,
          description: t.description || '',
          inputSchema: t.inputSchema || { type: 'object', properties: {}, additionalProperties: false }
        }));
        send({ jsonrpc: '2.0', id, result: { tools: list } });
      } else if (method === 'tools/call') {
        const toolName = params?.name;
        const input = params?.arguments || {};
        if (!toolMap.has(toolName)) throw new Error(`Unknown tool: ${toolName}`);
        const tool = toolMap.get(toolName);
        const result = await tool.run(input);
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }] } });
      } else {
        send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
      }
    } catch (err) {
      send({ jsonrpc: '2.0', id, error: { code: -32000, message: err?.message || String(err) } });
    }
  });
}

module.exports = { createServer };
