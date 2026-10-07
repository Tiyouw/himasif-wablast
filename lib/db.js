// lib/db.js — SQLite layer pakai node:sqlite (built-in, no native build)
// Dua DB dipisah sesuai plan §9: blast.sqlite (kredensial) vs votes.sqlite (suara)
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

function open(name) {
  const db = new DatabaseSync(path.join(DATA_DIR, name));
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

export const blastDb = open('blast.sqlite');
export const votesDb = open('votes.sqlite');

export function initBlastSchema() {
  blastDb.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('KETUA','OPERATOR')),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL REFERENCES admin_users(id),
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS senders (
      id INTEGER PRIMARY KEY,
      label TEXT,
      phone TEXT,
      status TEXT DEFAULT 'DISCONNECTED',
      qr TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY,
      angkatan INTEGER NOT NULL,
      nim TEXT,
      nama TEXT,
      phone TEXT,
      username TEXT UNIQUE,
      password TEXT,
      consent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_contacts_angkatan ON contacts(angkatan);
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY,
      angkatan INTEGER UNIQUE,
      body TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS blast_jobs (
      id INTEGER PRIMARY KEY,
      angkatan INTEGER,
      sender_id INTEGER,
      status TEXT DEFAULT 'DRAFT',
      throttle_min_ms INTEGER DEFAULT 5000,
      throttle_max_ms INTEGER DEFAULT 10000,
      window_start TEXT DEFAULT '08:00',
      window_end TEXT DEFAULT '17:00',
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      finished_at TEXT
    );
    CREATE TABLE IF NOT EXISTS blast_log (
      id INTEGER PRIMARY KEY,
      job_id INTEGER REFERENCES blast_jobs(id),
      contact_id INTEGER REFERENCES contacts(id),
      status TEXT DEFAULT 'QUEUED',
      error TEXT,
      sent_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_blastlog_job ON blast_log(job_id);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

export function initVotesSchema() {
  votesDb.exec(`
    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY,
      nomor_urut INTEGER,
      nama TEXT,
      warna TEXT,
      foto_url TEXT
    );
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY,
      contact_id INTEGER UNIQUE NOT NULL,
      candidate_id INTEGER NOT NULL REFERENCES candidates(id),
      angkatan INTEGER,
      voted_at TEXT DEFAULT (datetime('now')),
      ip_hash TEXT
    );
    CREATE TABLE IF NOT EXISTS voting_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  // migrasi ringan (DB lama tanpa kolom angkatan)
  try { votesDb.exec('ALTER TABLE votes ADD COLUMN angkatan INTEGER'); } catch {}
}

export function initSchema() {
  initBlastSchema();
  initVotesSchema();
}

// convenience wrappers
export const q = {
  run: (db, sql, ...p) => db.prepare(sql).run(...p),
  get: (db, sql, ...p) => db.prepare(sql).get(...p),
  all: (db, sql, ...p) => db.prepare(sql).all(...p),
};

// auto-init schema setiap kali modul ini di-import (app, worker, script)
initSchema();
