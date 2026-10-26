# Loqua Bot — Sui Airdrop Farmer

Auto daily check-in + Global Chat points farmer for **Loqua**, the privacy-first agentic messenger built on **Sui Network** (loqua.net).

- Daily check-in: +300 points/day
- Global Chat messaging for extra points
- Points carry over to the Loqua app at launch (no reset)
- Multi-account support
- Auto referral binding
- Token expiry detection
- Anti-spam chat (quality templates + random delays)
- Detailed logging

## How it works

Loqua uses Sui zkLogin. The bot works with the `access_token` returned by Loqua's `/auth/wallet/login` endpoint (valid 24h). You grab it once a day from browser DevTools and paste it into `config.json`.

```
POST /auth/wallet/nonce  → get nonce + message
POST /auth/wallet/login → access_token (Bearer, 24h)
─────────────────────────────────────────────
POST /sign-ins                    → daily check-in (+300 pts)
GET  /sign-ins/status             → check-in status
GET  /reward-points?wallet_address → total points
POST /global-chat/messages        → send chat message
POST /invites/referrals/bind      → bind referral code
```

## Setup

```bash
npm install
cp config.json.example config.json
# paste your access_token into config.json
```

## Usage

```bash
node index.js            # full run: check-in + chat
node index.js --checkin  # only check-in
node index.js --chat     # only chat
node index.js --status   # only status/points
node login.js            # verify a token
```

## Requirements

- Node.js 16+
- A Loqua account (sign in via Google at loqua.net)
- Access token refreshed daily (30 sec via DevTools)

## Disclaimer

No official airdrop/token announced yet — this is a points campaign. DYOR before participating.