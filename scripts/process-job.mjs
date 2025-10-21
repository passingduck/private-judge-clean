#!/usr/bin/env node

/**
 * Manual job processor for development
 * Usage: node scripts/process-job.mjs
 */

import https from 'https';

const WORKER_SECRET = 'pjw_dev_worker_secret_e8f4c2b9a1d6h3k7m5n9q2r8t4v6x1z3';
const API_URL = 'https://private-judge-lovat.vercel.app/api/jobs/process';

function processJob() {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WORKER_SECRET}`,
        'Content-Type': 'application/json'
      }
    };

    console.log(`[worker] Calling ${API_URL}...`);

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        console.log(`[worker] Status: ${res.statusCode}`);

        try {
          const data = JSON.parse(body);
          console.log(`[worker] Response:`, JSON.stringify(data, null, 2));

          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.message || body}`));
          }
        } catch (e) {
          console.error('[worker] Failed to parse response:', body);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.error('[worker] Request error:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Main execution
processJob()
  .then((result) => {
    console.log('[worker] ✅ Job processed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[worker] ❌ Failed to process job:', error.message);
    process.exit(1);
  });
