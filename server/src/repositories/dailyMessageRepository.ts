import { db } from '../db';
import { DailyMessage } from '../types/models';

export interface DailyMessageRepository {
  getByDate(date: string): Promise<DailyMessage | null>;
  upsert(date: string, message: string): Promise<DailyMessage>;
}

export class SqliteDailyMessageRepository implements DailyMessageRepository {
  async getByDate(date: string): Promise<DailyMessage | null> {
    const row = db.prepare('SELECT * FROM daily_messages WHERE date = ?').get(date) as unknown as DailyMessage | undefined;
    return row ?? null;
  }

  async upsert(date: string, message: string): Promise<DailyMessage> {
    const updatedAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO daily_messages (date, message, updatedAt) VALUES (?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET message = excluded.message, updatedAt = excluded.updatedAt`
    ).run(date, message, updatedAt);
    return { date, message, updatedAt };
  }
}
