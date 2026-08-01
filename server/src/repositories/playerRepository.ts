import { db } from '../db';
import { Player } from '../types/models';

export interface PlayerRepository {
  getAll(): Promise<Player[]>;
  getById(id: string): Promise<Player | null>;
  create(player: Player): Promise<Player>;
  update(id: string, player: Partial<Player>): Promise<Player | null>;
  delete(id: string): Promise<void>;
}

type PlayerRow = Omit<Player, 'isAdmin'> & { isAdmin: number };

function rowToPlayer(row: PlayerRow): Player {
  return { ...row, isAdmin: Boolean(row.isAdmin) };
}

const UPDATABLE_FIELDS: (keyof Player)[] = ['firstName', 'lastName', 'frontTarget', 'backTarget', 'notes', 'isAdmin'];

export class SqlitePlayerRepository implements PlayerRepository {
  async getAll(): Promise<Player[]> {
    const rows = db.prepare('SELECT * FROM players').all() as unknown as PlayerRow[];
    return rows.map(rowToPlayer);
  }

  async getById(id: string): Promise<Player | null> {
    const row = db.prepare('SELECT * FROM players WHERE id = ?').get(id) as unknown as PlayerRow | undefined;
    return row ? rowToPlayer(row) : null;
  }

  async create(player: Player): Promise<Player> {
    db.prepare(
      `INSERT INTO players (id, firstName, lastName, frontTarget, backTarget, notes, isAdmin, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      player.id,
      player.firstName,
      player.lastName,
      player.frontTarget,
      player.backTarget,
      player.notes ?? null,
      player.isAdmin ? 1 : 0,
      player.createdAt,
      player.updatedAt
    );
    return player;
  }

  async update(id: string, playerUpdate: Partial<Player>): Promise<Player | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }
    const updated: Player = { ...existing, ...playerUpdate, updatedAt: new Date().toISOString() };
    const assignments = UPDATABLE_FIELDS.map((field) => `${field} = ?`).join(', ');
    db.prepare(`UPDATE players SET ${assignments}, updatedAt = ? WHERE id = ?`).run(
      updated.firstName,
      updated.lastName,
      updated.frontTarget,
      updated.backTarget,
      updated.notes ?? null,
      updated.isAdmin ? 1 : 0,
      updated.updatedAt,
      id
    );
    return updated;
  }

  async delete(id: string): Promise<void> {
    db.prepare('DELETE FROM players WHERE id = ?').run(id);
  }
}
