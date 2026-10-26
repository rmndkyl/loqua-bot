const fs = require('fs');
const path = require('path');

function getLogPath() {
  let cfg = {};
  try { cfg = require('../config.json'); } catch (e) {}
  return cfg.log_file || 'logs/bot.log';
}

function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(msg, level = 'INFO') {
  const line = `[${ts()}] [${level}] ${msg}`;
  console.log(line);
  try {
    const p = getLogPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.appendFileSync(p, line + '\n');
  } catch (e) {}
}

module.exports = { log };