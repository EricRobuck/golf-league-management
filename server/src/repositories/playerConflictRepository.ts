import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { PlayerConflict } from '../types/models';

export interface PlayerConflictRepository {
  getAll(): Promise<PlayerConflict[]>;
  create(playerAId: string, playerBId: string): Promise<PlayerConflict>;
  delete(id: string): Promise<void>;
}

export class SqlitePlayerConflictRepository implements PlayerConflictRepository {
  async getAll(): Promise<PlayerConflict[]> {
    return db.prepare('SELECT * FROM player_conflicts').all() as unknown as PlayerConflict[];
  }

  async create(playerAId: string, playerBId: string): Promise<PlayerConflict> {
    const conflict: PlayerConflict = {
      id: `conflict-${uuidv4()}`,
      playerAId,
      playerBId,
      createdAt: new Date().toISOString(),
    };
    db.prepare('INSERT INTO player_conflicts (id, playerAId, playerBId, createdAt) VALUES (?, ?, ?, ?)').run(
      conflict.id,
      conflict.playerAId,
      conflict.playerBId,
      conflict.createdAt
    );
    return conflict;
  }

  async delete(id: string): Promise<void> {
    db.prepare('DELETE FROM player_conflicts WHERE id = ?').run(id);
  }
}
