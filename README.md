# Dumbass

Discord-native Jules control plane — **First Slice** per `DUMBASS-KIRO-SLICE-001`
(Kiro handoff: `~/Downloads/Discord/dumbass_kiro_first_slice_handoff`).

Greenfield Node.js + discord.js v14 build on `ForMySumchins/democracy-bot` (working branch `dumbass-bot`).

## What it does

Slash commands in one guild (owner/`ALLOW_ROLES` gated, FS-01):

| Command | Action |
|---|---|
| `/jules-new repo:<owner/repo> task:<text> [branch:<b>]` | Dispatch a task to Jules (remote VM) |
| `/jules-list [limit:<n>]` | Recent sessions + status (Awaiting Plan / Completed / …) |
| `/jules-repos` | Repos Jules can target for your Google account |
| `/jules-pull session:<id>` | Pull the session's diff (read-only) |

Receipts + audit lines go to the configured log channel (`FS-02`), independently of
the interaction reply, so long jobs never depend on the interaction token (spec invariant).

## Jules auth (no API keys)

The `jules` CLI authenticates via a **gnome-keyring OAuth token** (device-code flow,
scope `www.googleapis.com/auth/aida`), auto-refreshed. The bot spawns the binary and
inherits `DBUS_SESSION_BUS_ADDRESS` from `.env`. First login on this box is done;
on a new box run `jules login --no-launch-browser`.

## Setup

```bash
cp .env.example .env      # fill DISCORD_TOKEN, GUILD_ID, LOG_CHANNEL_ID
npm start                 # guild-scoped slash commands register on boot
npm test
```

Requires: Node ≥ 20, `jules` CLI (`npm i -g @google/jules` with a writable prefix),
a running gnome-keyring-daemon on the DBus session bus.

## Layout

```
src/index.js      entrypoint: client, guild scope, command registration
src/config.js     env/.env loading + validation
src/commands.js   slash commands (dispatch/list/repos/pull) + role gates
src/jules.js      CLI wrapper: spawn + table parsing (fixtures-tested)
src/store.js      JSON dispatch registry (persists across restarts)
src/receipt.js    FS-02 receipt block + 4000-char chunking
test/             node:test suites against real CLI output fixtures
data/             dispatches.json (gitignored)
```

## Notes / open items (per spec)

- `jules` CLI has **no `approve` verb** — plan approval in Discord stays OPEN
  (`Awaiting Plan` is surfaced, not actionable).
- Plan-approval + push-back to GitHub is a later slice; this slice is read-only pull.
- Guild/channel IDs from the spec are **unverified** — confirm in `.env` before going live.
