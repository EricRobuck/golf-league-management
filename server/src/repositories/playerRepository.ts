import { db } from '../db';
import { Player } from '../types/models';

export interface PlayerRepository {
  getAll(): Promise<Player[]>;
  getById(id: string): Promise<Player | null>;
  create(player: Player): Promise<Player>;
  update(id: string, player: Partial<Player>): Promise<Player | null>;
  delete(id: string): Promise<void>;
}

const UPDATABLE_FIELDS: (keyof Player)[] = ['firstName', 'lastName', 'frontTarget', 'backTarget', 'notes'];

export class SqlitePlayerRepository implements PlayerRepository {
  async getAll(): Promise<Player[]> {
    return db.prepare('SELECT * FROM players').all() as unknown as Player[];
  }

  async getById(id: string): Promise<Player | null> {
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    return (player as unknown as Player) ?? null;
  }

  async create(player: Player): Promise<Player> {
    db.prepare(
      `INSERT INTO players (id, firstName, lastName, frontTarget, backTarget, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      player.id,
      player.firstName,
      player.lastName,
      player.frontTarget,
      player.backTarget,
      player.notes ?? null,
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
      updated.updatedAt,
      id
    );
    return updated;
  }

  async delete(id: string): Promise<void> {
    db.prepare('DELETE FROM players WHERE id = ?').run(id);
  }
}
