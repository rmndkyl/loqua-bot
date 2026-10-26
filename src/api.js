const https = require('https');
const { log } = require('./logger');

let BASE = 'https://api.loqua.net';
try { BASE = require('../config.json').api_base_url || BASE; } catch (e) {}

function request(method, path, { token, body, query } = {}) {
  return new Promise((resolve, reject) => {
    let url = `${BASE}${path}`;
    if (query) {
      const q = new URLSearchParams(query);
      url += (url.includes('?') ? '&' : '?') + q.toString();
    }
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = https.request(url, { method, headers, timeout: 20000 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = { raw: data }; }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// GET /sign-ins/status - check if already signed in today
async function signInStatus(token) {
  const r = await request('GET', '/sign-ins/status', { token });
  return r;
}

// POST /sign-ins - daily check-in (zklogin flow, requires valid Bearer access_token)
async function signIn(token, signatureScheme = 'ZkLogin') {
  const r = await request('POST', '/sign-ins', {
    token,
    body: {
      source: 'loqua_auth',
      metadata: { client: 'loqua_web', login_type: 'zklogin', signature_scheme: signatureScheme }
    }
  });
  return r;
}

// GET /reward-points?wallet_address= - check total points
async function rewardPoints(token, walletAddress) {
  const r = await request('GET', '/reward-points', { token, query: { wallet_address: walletAddress } });
  return r;
}

// GET /invites/referrals/me - check referral state
async function referralsMe(token) {
  const r = await request('GET', '/invites/referrals/me', { token });
  return r;
}

// POST /invites/referrals/bind - bind invite code
async function bindReferral(token, inviteCode) {
  const r = await request('POST', '/invites/referrals/bind', { token, body: { invite_code: inviteCode } });
  return r;
}

// POST /global-chat/messages - send a message to global chat
async function sendMessage(token, body) {
  const r = await request('POST', '/global-chat/messages', { token, body });
  return r;
}

module.exports = { signInStatus, signIn, rewardPoints, referralsMe, bindReferral, sendMessage, BASE };