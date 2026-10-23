// src/commands.js — slash command definitions + handlers.
// Each command: { name, desc, options: [...], run(ctx) } where
// ctx = { client, interaction, cfg, store, receiptChannel }
import * as J from './jules.js';
import { receiptBlock, chunk4k, logLine } from './receipt.js';

function canDispatch(cfg, member) {
  if (cfg.openToAll) return true;
  if (member?.owner) return true; // guild owner always allowed
  if (cfg.allowedRoles.length) {
    return member?.roles?.cache?.some(r => cfg.allowedRoles.includes(r.name));
  }
  return false;
}

export const commands = [
  {
    name: 'jules-new',
    desc: 'Dispatch a task to Jules on a repo',
    options: [
      { name: 'repo', type: 3, desc: 'owner/repo (defaults to DEFAULT_REPO)', required: false },
      { name: 'task', type: 3, desc: 'the task prompt', required: true },
      { name: 'branch', type: 3, desc: 'starting branch (optional)', required: false },
    ],
    async run(ctx) {
      const { cfg, interaction, store } = ctx;
      if (!canDispatch(cfg, interaction.member)) {
        await interaction.reply({ content: '❌ You are not authorized to dispatch Jules tasks.', ephemeral: true });
        return;
      }
      const task = interaction.options.getString('task', true);
      const repo = interaction.options.getString('repo', false) || cfg.defaultRepo;
      const branch = interaction.options.getString('branch', false) || undefined;
      await interaction.deferReply();
      const r = await J.julesNew(cfg, repo, task, branch);
      const parsed = J.parseNew(r.stdout + '\n' + r.stderr);
      if (!r.ok && !parsed.id) {
        const detail = (r.stderr || r.stdout).slice(-500);
        await interaction.editReply(`❌ Dispatch failed (exit ${r.code})\n\`\`\`${detail}\`\`\``);
        return;
      }
      store.add({ id: parsed.id, repo, prompt: task, status: 'dispatched', createdAt: Date.now() });
      const rec = receiptBlock({ id: parsed.id, repo, prompt: task, status: 'dispatched' });
      await interaction.editReply(rec);
      // FS-02: independent log channel
      try { await ctx.receiptChannel.send(logLine('jules-new', parsed.id)); } catch { /* log ch optional */ }
    },
  },
  {
    name: 'jules-list',
    desc: 'List recent Jules sessions and their status',
    options: [{ name: 'limit', type: 4, desc: 'how many (default 15)', required: false }],
    async run(ctx) {
      const { cfg, interaction } = ctx;
      const limit = interaction.options.getInteger('limit', false) || 15;
      await interaction.deferReply();
      const r = await J.julesListSessions(cfg);
      if (!r.ok) { await interaction.editReply(`❌ ${((r.stderr)||'').slice(-300)}`); return; }
      const rows = J.parseListSessions(r.stdout).slice(0, limit);
      if (!rows.length) { await interaction.editReply('No sessions found.'); return; }
      const body = rows.map(s =>
        `**${s.id}** · ${s.repo||'?'} · ${s.status||'unknown'}\n   ${ (s.desc||'').slice(0,90) }`).join('\n');
      await interaction.editReply(chunk4k(body).join('\n'));
    },
  },
  {
    name: 'jules-repos',
    desc: 'List repos Jules can target for your account',
    options: [],
    async run(ctx) {
      const { cfg, interaction } = ctx;
      const r = await J.julesListRepos(cfg);
      if (!r.ok) { await interaction.reply({ content: '❌ ' + (r.stderr||'').slice(-300), ephemeral: true }); return; }
      const repos = J.parseListRepos(r.stdout);
      await interaction.reply(`Jules repos:\n${repos.map(x=>`\`${x}\``).join('\n')}`);
    },
  },
  {
    name: 'jules-pull',
    desc: 'Pull the result/patch of a Jules session',
    options: [{ name: 'session', type: 3, desc: 'Jules session id', required: true }],
    async run(ctx) {
      const { cfg, interaction, store } = ctx;
      if (!canDispatch(cfg, interaction.member)) {
        await interaction.reply({ content: '❌ You are not authorized to pull Jules results.', ephemeral: true });
        return;
      }
      const id = interaction.options.getString('session', true);
      await interaction.deferReply();
      const r = await J.julesPull(cfg, id);
      const out = (r.stdout + '\n' + r.stderr).trim();
      store.set(id, { status: r.ok ? 'pulled' : 'pull-failed', updatedAt: Date.now() });
      await interaction.editReply(`\`\`\`${ (out || '(empty)').slice(0,3900) }\`\`\``);
    },
  },
];

export function buildSlashJSON() {
  return commands.map(c => ({
    name: c.name,
    description: c.desc,
    options: c.options.map(o => ({
      name: o.name, description: o.desc, type: o.type, required: o.required,
    })),
  }));
}
