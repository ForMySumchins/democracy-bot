// src/jules.js — thin, deterministic wrapper around the `jules` CLI.
// The CLI talks to aida.googleapis.com/v1/swebot with an OAuth token from the
// gnome-keyring; we just spawn it and parse the table output. No API keys.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CLI_RE = /\b\d+\s+(days?|hours?|minutes?|seconds?)\s+ago\b/;
const REPO_TAIL = /([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\s*$/;

function run(bin, args, env, timeoutMs = 90_000) {
  return new Promise((resolve) => {
    const p = spawn(bin, args, { env: { ...process.env, ...env } });
    let out = '', err = '', done = false;
    const t = setTimeout(() => { if (!done) { done = true; p.kill('SIGKILL'); resolve({ ok: false, code: -1, stdout: out + '\n[dumbass] timeout', stderr: err }); } }, timeoutMs);
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => err += d);
    p.on('close', code => { if (done) return; done = true; clearTimeout(t); resolve({ ok: code === 0, code, stdout: out, stderr: err }); });
    p.on('error', e => { if (done) return; done = true; clearTimeout(t); resolve({ ok: false, code: -1, stdout: out, stderr: err + String(e) }); });
  });
}

export function julesEnv(cfg) {
  const env = {};
  if (cfg.dbus) env.DBUS_SESSION_BUS_ADDRESS = cfg.dbus;
  env.PATH = `${(process.env.HOME || '/home/sama')}/.local/bin:${process.env.PATH || '/usr/bin:/bin'}`;
  return env;
}

// Parse `jules remote list --session` table (data rows are fixed-width, 150 cols
// as of CLI v0.1.42; parser does NOT assume width — see comments).
export function parseListSessions(text) {
  const out = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const idm = line.match(/^\s*(\d+)\s+(.*)$/);
    if (!idm) continue;
    const id = idm[1], rest = idm[2];
    const lam = rest.match(CLI_RE);
    let status = '', body = rest;
    if (lam) { status = rest.slice(lam.index + lam[0].length).trim(); body = rest.slice(0, lam.index); }
    const rm = body.match(REPO_TAIL);
    let repo = '', desc = '';
    if (rm) { repo = rm[1]; desc = body.slice(0, rm.index).trim(); } else desc = body.trim();
    out.push({ id, repo, desc, status });
  }
  return out;
}

export function parseListRepos(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean);
}

// Parse `jules new ...` stdout for the session URL/ID: "Session created: <base>/session/<id>"
export function parseNew(text) {
  const m = text.match(/session\/([A-Za-z0-9]+)/i);
  const id = m ? m[1] : null;
  return {
    id,
    url: id ? `https://jules.google/session/${id}` : null,
    raw: text,
  };
}

export async function julesListSessions(cfg) {
  return run(cfg.julesBin, ['remote', 'list', '--session'], julesEnv(cfg));
}
export async function julesListRepos(cfg) {
  return run(cfg.julesBin, ['remote', 'list', '--repo'], julesEnv(cfg));
}
export async function julesNew(cfg, repo, prompt, branch) {
  const args = ['new', '--repo', repo];
  if (branch) args.push('--branch', branch); // CLI may ignore; harmless
  args.push(prompt);
  return run(cfg.julesBin, args, julesEnv(cfg), 120_000);
}
export async function julesPull(cfg, sessionId) {
  return run(cfg.julesBin, ['remote', 'pull', '--session', sessionId], julesEnv(cfg));
}

export function loadFixture(name) {
  return readFileSync(new URL(`../test/fixtures/${name}`, import.meta.url), 'utf8');
}
