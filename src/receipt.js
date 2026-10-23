// src/receipt.js — FS-02: deterministic receipt + log to #dumbass-logs.
function ts() { return new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z'; }

export function receiptBlock({ id, repo, prompt, status }) {
  const p = prompt.length > 480 ? prompt.slice(0, 480) + '…' : prompt;
  const body = [
    `**JULES DISPATCH**`,
    `session: \`${id}\``,
    `repo: \`${repo || '—'}\``,
    `task: ${p}`,
    `status: ${status || 'dispatched'}`,
    `link: https://jules.google/session/${id}`,
    `log: ${ts()}`,
  ].join('\n');
  return body;
}

// Discord content is capped at 4000.
export function chunk4k(text) {
  if (text.length <= 4000) return [text];
  const out = [];
  for (let i = 0; i < text.length; i += 3980) out.push(text.slice(i, i + 3980));
  return out;
}

export function logLine(ev, detail = '') {
  return `[${ts()}] ${ev}${detail ? ' — ' + detail : ''}`;
}
