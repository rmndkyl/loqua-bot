#!/usr/bin/env node
/**
 * login.js - Helper to get a fresh Loqua access_token (valid 24h).
 *
 * The user chose the MANUAL approach: grab access_token from browser DevTools.
 * Steps:
 *   1. Open https://loqua.net/ in Chrome and sign in with Google (zkLogin).
 *   2. Open DevTools (F12) -> Network tab -> filter "sign-ins" or "login".
 *   3. Find the POST https://api.loqua.net/auth/wallet/login request.
 *   4. Copy the access_token from its Response JSON.
 *   5. Paste it into config.json for the matching account.
 *
 * This script just decodes a token you paste to confirm it's valid and shows expiry.
 */
const readline = require('readline');
const { log } = require('./src/logger');

function jwtExpiresInSec(token) {
  try {
    const p = token.split('.')[1];
    const pad = p + '='.repeat((4 - (p.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(pad, 'base64url').toString());
    return { exp: payload.exp, email: payload.email || payload.sub, expiresIn: payload.exp - Math.floor(Date.now() / 1000) };
  } catch (e) { return null; }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste Loqua access_token (from /auth/wallet/login response): ', (tok) => {
  const info = jwtExpiresInSec(tok.trim());
  if (!info) { log('Could not decode token. Make sure you copied the full access_token.', 'ERROR'); }
  else {
    const hrs = info.expiresIn / 3600;
    log(`Token OK. Decoded:`);
    log(`  subject/email: ${info.email}`);
    log(`  expires in: ${hrs >= 1 ? hrs.toFixed(1) + ' hours' : (info.expiresIn / 60).toFixed(0) + ' minutes'}`);
    log(`  (valid for ~24h from /auth/wallet/login)`.replace('~24h', hrs >= 23 ? '~24h' : `${hrs.toFixed(1)}h`));
    log(`Paste this into config.json -> accounts[].access_token, then run: node index.js`);
  }
  rl.close();
});