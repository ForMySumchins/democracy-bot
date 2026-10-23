// src/index.js — Dumbass entrypoint: discord.js v14, guild-scoped slash commands.
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { loadConfig } from './config.js';
import { commands, buildSlashJSON } from './commands.js';
import { Store } from './store.js';
import { logLine } from './receipt.js';

const cfg = loadConfig(new URL('..', import.meta.url).pathname.replace(/\/$/, ''));
const store = new Store(cfg.dataFile);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.rest.setRetryCount(2);

client.once('clientReady', async () => {
  console.log(logLine('ready', `as ${client.user.tag}`));
  // Register guild-scoped slash commands (FS-01: single-guild deploy)
  const rest = new REST().setToken(cfg.token);
  const app = client.application?.id ?? (await client.application.fetch()).id;
  const data = await rest.put(Routes.applicationGuildCommands(app, cfg.guildId), { body: buildSlashJSON() });
  console.log(logLine('slash-commands-registered', `${data.length} commands in guild ${cfg.guildId}`));
  const guild = await client.guilds.cache.get(cfg.guildId)?.fetch().catch(() => null);
  if (!guild) { console.warn('[index] warning: target guild not reachable; will not enforce guild-scoping'); }
  // resolve receipt channel
  const ch = guild ? guild.channels.cache.get(cfg.logChannelId) : null;
  if (ch) ch.send(logLine('session-start', `Dumbass online (${client.user.tag})`)).catch(() => {});
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = commands.find(c => c.name === interaction.commandName);
  if (!cmd) return;
  // FS-01: enforce target guild
  if (cfg.guildId && interaction.guild?.id && interaction.guild.id !== cfg.guildId) {
    if (interaction.deferred) await interaction.editReply({ content: '❌ This bot only operates in its home guild.', ephemeral: true })
      .catch(() => interaction.reply({ content: '❌ Wrong guild.', ephemeral: true }));
    return;
  }
  const receiptChannel = await (interaction.client.channels?.cache?.get?.(cfg.logChannelId)).catch?.(() => null);
  const ctx = { client, interaction, cfg, store, receiptChannel };
  try {
    await cmd.run(ctx);
  } catch (e) {
    console.error('[index] command error', e);
    try {
      if (interaction.deferred) await interaction.editReply(`❌ ${e.message}`);
      else await interaction.reply({ content: `❌ ${e.message}`, ephemeral: true });
    } catch { /* interaction may have expired */ }
  }
});

client.once('error', (e) => console.error(logLine('client-error', e.message)));

client.login(cfg.token);
