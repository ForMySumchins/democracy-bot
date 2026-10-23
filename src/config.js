// src/config.js — environment loading + validation (FS-01, FS-03)
import fs from 'node:fs';

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name} (see .env.example)`);
  return v;
}

export function loadConfig(rootDir = process.cwd()) {
  loadDotEnv(`${rootDir}/.env`);
  const cfg = {
    token: required('DISCORD_TOKEN'),
    guildId: required('GUILD_ID'),
    logChannelId: process.env.LOG_CHANNEL_ID || '',
    // LOG_CHANNEL_ID optional: receipts fall back to the interaction channel
    listenChannelId: process.env.LISTEN_CHANNEL_ID || '',
    julesBin: process.env.JULES_BIN || 'jules',
    dbus: process.env.DBUS_SESSION_BUS_ADDRESS || '',
    defaultRepo: process.env.DEFAULT_REPO || '',
    allowedGuilds: (process.env.ALLOWED_GUILDS || '').split(',').map(s => s.trim()).filter(Boolean),
    allowedRoles: (process.env.ALLOW_ROLES || '').split(',').map(s => s.trim()).filter(Boolean),
    openToAll: process.env.JULES_OPEN === 'true',
    dataFile: `${rootDir}/data/dispatches.json`,
  };
  if (!cfg.logChannelId) console.warn('[config] LOG_CHANNEL_ID not set — receipts will post to the interaction channel only (spec FS-02 wants a dedicated log channel)');
  if (cfg.openToAll) console.warn('[config] JULES_OPEN=true — /jules-new is open to all members. Dev only.');
  return cfg;
}
