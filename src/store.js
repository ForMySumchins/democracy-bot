// src/store.js — tiny JSON-backed registry of dispatched Jules sessions.
// Lets /dumbass-list and receipts work across restarts without a database
// (the spec's "database proposal" is a later slice; this is enough for First Slice).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

export class Store {
  constructor(file) { this.file = file; this.data = this._load(); }
  _load() {
    try { if (existsSync(this.file)) return JSON.parse(readFileSync(this.file, 'utf8')); } catch { /* corrupt -> reset */ }
    return { dispatches: {} };
  }
  _save() {
    if (!existsSync(dirname(this.file))) mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(this.data, null, 2));
  }
  add(d) { this.data.dispatches[d.id] = d; this._save(); return d; }
  set(id, patch) { const cur = this.data.dispatches[id]; if (!cur) return null; Object.assign(cur, patch, { updatedAt: Date.now() }); this._save(); return cur; }
  get(id) { return this.data.dispatches[id] || null; }
  all() { return Object.values(this.data.dispatches).sort((a, b) => b.createdAt - a.createdAt); }
}
