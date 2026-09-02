import { db } from '../db';
import { ExceptionEntry } from '../types/models';

export interface ExceptionListRepository {
  getAll(): Promise<ExceptionEntry[]>;
  add(playerId: string): Promise<ExceptionEntry>;
  remove(playerId: string): Promise<void>;
}

export class SqliteExceptionListRepository implements ExceptionListRepository {
  async getAll(): Promise<ExceptionEntry[]> {
    return db.prepare('SELECT * FROM exception_list').all() as unknown as ExceptionEntry[];
  }

  async add(playerId: string): Promise<ExceptionEntry> {
    const entry: ExceptionEntry = { playerId, createdAt: new Date().toISOString() };
    db.prepare('INSERT INTO exception_list (playerId, createdAt) VALUES (?, ?)').run(entry.playerId, entry.createdAt);
    return entry;
  }

  async remove(playerId: string): Promise<void> {
    db.prepare('DELETE FROM exception_list WHERE playerId = ?').run(playerId);
  }
}
