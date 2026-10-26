#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { log } = require('./src/logger');
const api = require('./src/api');

let CONFIG = {};
try { CONFIG = require('./config.json'); } catch (e) {
  log('config.json not found. Copy config.json.example to config.json and fill tokens.', 'ERROR');
  process.exit(1);
}

const ACCS = CONFIG.accounts || [];
const CHAT = CONFIG.chat || {};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function randDelay(minS, maxS) { return Math.floor((minS + Math.random() * (maxS - minS)) * 1000); }

function isTokenStale(token) {
  if (!token || token.startsWith('PASTE_')) return true;
  return false;
}

// Decode JWT exp to detect expiry without throwing
function jwtExpiresInSec(token) {
  try {
    const p = token.split('.')[1];
    const pad = p + '='.repeat((4 - (p.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(pad, 'base64url').toString());
    if (payload.exp) return payload.exp - Math.floor(Date.now() / 1000);
  } catch (e) {}
  return null;
}

async function dailyCheckin(acc) {
  const { email, wallet_address, access_token, invite_code } = acc;
  log(`--- ${email} (${wallet_address.slice(0, 10)}...) ---`);

  if (isTokenStale(access_token)) {
    log('  access_token is placeholder/empty. Run login.js or paste real token.', 'ERROR');
    return;
  }
  const expIn = jwtExpiresInSec(access_token);
  if (expIn !== null && expIn < 0) {
    log(`  access_token EXPIRED (${-expIn}s ago). Need refresh via login.js.`, 'ERROR');
    return;
  }
  if (expIn !== null && expIn < 3600) {
    log(`  token expires in ${Math.floor(expIn / 60)} min.`, 'WARN');
  }

  // 1. Check sign-in status
  const status = await api.signInStatus(access_token);
  if (status.status === 401) {
    log('  Unauthorized. Token invalid/expired - refresh via login.js.', 'ERROR');
    return;
  }
  const alreadySigned = status.json && status.json.already_signed;
  const totalDays = status.json ? status.json.total_sign_in_days : null;
  log(`  sign-ins/status: already_signed=${alreadySigned}, total_days=${totalDays}`);

  // 2. Daily check-in if not already done
  if (!alreadySigned) {
    const si = await api.signIn(access_token);
    log(`  POST /sign-ins -> HTTP ${si.status}: ${JSON.stringify(si.json).slice(0, 200)}`);
  } else {
    log('  Already checked in today.');
  }

  // 3. Reward points
  const rp = await api.rewardPoints(access_token, wallet_address);
  if (rp.json) {
    log(`  reward-points: total=${rp.json.total_points}, currency=${rp.json.currency || 'MP'}`);
  }

  // 4. Referral - bind if not yet bound
  const ref = await api.referralsMe(access_token);
  if (ref.json && ref.json.referral) {
    const hasInvites = ref.json.referral.invite_records && ref.json.referral.invite_records.length > 0;
    if (!hasInvites && invite_code) {
      const bind = await api.bindReferral(access_token, invite_code);
      log(`  bindReferral(${invite_code}) -> HTTP ${bind.status}: ${JSON.stringify(bind.json).slice(0, 120)}`);
    } else {
      log('  Referral already bound.');
    }
  }

  return { email, totalDays, points: rp.json ? rp.json.total_points : null };
}

async function chatRound(acc) {
  const { email, access_token } = acc;
  const templates = (CHAT.quality_templates || []);
  if (!CHAT.enabled || templates.length === 0) {
    log('Chat disabled or no templates.', 'WARN');
    return;
  }
  const msgCount = CHAT.messages_per_day || 3;

  // Check token valid first
  const status = await api.signInStatus(access_token);
  if (status.status !== 200) {
    log(`  Chat skipped: sign-ins/status HTTP ${status.status}`, 'WARN');
    return;
  }

  for (let i = 0; i < msgCount; i++) {
    const text = templates[Math.floor(Math.random() * templates.length)];
    const body = { content: text, message_type: 'text' };
    const r = await api.sendMessage(access_token, body);
    const ok = r.status === 200 || r.status === 201;
    log(`  [${email}] message ${i + 1}/${msgCount} -> HTTP ${r.status}: ${ok ? 'sent' : JSON.stringify(r.json).slice(0, 120)}`);
    if (i < msgCount - 1) await sleep(randDelay(CHAT.min_delay_sec || 60, CHAT.max_delay_sec || 180));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--checkin') ? 'checkin'
    : args.includes('--chat') ? 'chat'
    : args.includes('--status') ? 'status'
    : 'full';

  log(`Loqua bot start (mode=${mode}, accounts=${ACCS.length})`);
  if (ACCS.length === 0) { log('No accounts in config.', 'ERROR'); return; }

  const results = [];
  for (const acc of ACCS) {
    try {
      if (mode === 'status') {
        const status = await api.signInStatus(acc.access_token);
        const rp = await api.rewardPoints(acc.access_token, acc.wallet_address);
        log(`${acc.email}: sign-ins HTTP ${status.status}, already_signed=${status.json && status.json.already_signed}, points=${rp.json ? rp.json.total_points : '?'}`);
      } else if (mode === 'chat') {
        await chatRound(acc);
      } else {
        results.push(await dailyCheckin(acc));
        if (CHAT.enabled && mode === 'full') {
          await sleep(randDelay(5, 10));
          await chatRound(acc);
        }
      }
    } catch (e) {
      log(`${acc.email}: error - ${e.message}`, 'ERROR');
    }
  }
  log('Loqua bot done.');
}

main().catch((e) => { log('Fatal: ' + e.message, 'ERROR'); process.exit(1); });