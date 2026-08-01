import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const seedDir = path.resolve(__dirname, '../../data');
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : seedDir;
const dbFile = path.join(dataDir, 'golf.db');
const legacyPlayersFile = path.join(seedDir, 'players.json');
const legacyLeagueDaysFile = path.join(seedDir, 'league-days.json');

fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(dbFile);

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    frontTarget INTEGER NOT NULL,
    backTarget INTEGER NOT NULL,
    notes TEXT,
    isAdmin INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS league_days (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    courseId TEXT NOT NULL,
    scoringNine TEXT NOT NULL,
    status TEXT NOT NULL,
    selectedPlayers TEXT NOT NULL,
    teams TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

const playerColumns = db.prepare('PRAGMA table_info(players)').all() as { name: string }[];
if (!playerColumns.some((column) => column.name === 'isAdmin')) {
  db.exec('ALTER TABLE players ADD COLUMN isAdmin INTEGER NOT NULL DEFAULT 0');
}

const playerCount = db.prepare('SELECT COUNT(*) as count FROM players').get() as { count: number };
if (playerCount.count === 0) {
  migrateLegacyJsonFiles();
}

function migrateLegacyJsonFiles(): void {
  if (fs.existsSync(legacyPlayersFile)) {
    const players = JSON.parse(fs.readFileSync(legacyPlayersFile, 'utf-8')) as any[];
    if (players.length > 0) {
      const insert = db.prepare(
        `INSERT INTO players (id, firstName, lastName, frontTarget, backTarget, notes, isAdmin, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const p of players) {
        insert.run(
          p.id,
          p.firstName,
          p.lastName,
          p.frontTarget,
          p.backTarget,
          p.notes ?? null,
          p.isAdmin ? 1 : 0,
          p.createdAt,
          p.updatedAt
        );
      }
    }
  }

  if (fs.existsSync(legacyLeagueDaysFile)) {
    const leagueDays = JSON.parse(fs.readFileSync(legacyLeagueDaysFile, 'utf-8')) as any[];
    if (leagueDays.length > 0) {
      const insert = db.prepare(
        `INSERT INTO league_days (id, date, courseId, scoringNine, status, selectedPlayers, teams, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const d of leagueDays) {
        insert.run(
          d.id,
          d.date,
          d.courseId,
          d.scoringNine,
          d.status,
          JSON.stringify(d.selectedPlayers ?? []),
          JSON.stringify(d.teams ?? []),
          d.createdAt,
          d.updatedAt
        );
      }
    }
  }
}
