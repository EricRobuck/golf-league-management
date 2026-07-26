import { db } from '../db';
import { LeagueDay } from '../types/models';

export interface LeagueDayRepository {
  getAll(): Promise<LeagueDay[]>;
  getById(id: string): Promise<LeagueDay | null>;
  create(leagueDay: LeagueDay): Promise<LeagueDay>;
  update(id: string, leagueDay: Partial<LeagueDay>): Promise<LeagueDay | null>;
}

type LeagueDayRow = {
  id: string;
  date: string;
  courseId: string;
  scoringNine: string;
  status: string;
  selectedPlayers: string;
  teams: string;
  createdAt: string;
  updatedAt: string;
};

function rowToLeagueDay(row: LeagueDayRow): LeagueDay {
  return {
    id: row.id,
    date: row.date,
    courseId: row.courseId,
    scoringNine: row.scoringNine as LeagueDay['scoringNine'],
    status: row.status as LeagueDay['status'],
    selectedPlayers: JSON.parse(row.selectedPlayers),
    teams: JSON.parse(row.teams),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const UPDATABLE_FIELDS: (keyof LeagueDay)[] = ['date', 'courseId', 'scoringNine', 'status', 'selectedPlayers', 'teams'];

export class SqliteLeagueDayRepository implements LeagueDayRepository {
  async getAll(): Promise<LeagueDay[]> {
    const rows = db.prepare('SELECT * FROM league_days').all() as unknown as LeagueDayRow[];
    return rows.map(rowToLeagueDay);
  }

  async getById(id: string): Promise<LeagueDay | null> {
    const row = db.prepare('SELECT * FROM league_days WHERE id = ?').get(id) as unknown as LeagueDayRow | undefined;
    return row ? rowToLeagueDay(row) : null;
  }

  async create(leagueDay: LeagueDay): Promise<LeagueDay> {
    db.prepare(
      `INSERT INTO league_days (id, date, courseId, scoringNine, status, selectedPlayers, teams, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      leagueDay.id,
      leagueDay.date,
      leagueDay.courseId,
      leagueDay.scoringNine,
      leagueDay.status,
      JSON.stringify(leagueDay.selectedPlayers),
      JSON.stringify(leagueDay.teams),
      leagueDay.createdAt,
      leagueDay.updatedAt
    );
    return leagueDay;
  }

  async update(id: string, leagueDayUpdate: Partial<LeagueDay>): Promise<LeagueDay | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }
    const updated: LeagueDay = { ...existing, ...leagueDayUpdate, updatedAt: new Date().toISOString() };
    const assignments = UPDATABLE_FIELDS.map((field) => `${field} = ?`).join(', ');
    db.prepare(`UPDATE league_days SET ${assignments}, updatedAt = ? WHERE id = ?`).run(
      updated.date,
      updated.courseId,
      updated.scoringNine,
      updated.status,
      JSON.stringify(updated.selectedPlayers),
      JSON.stringify(updated.teams),
      updated.updatedAt,
      id
    );
    return updated;
  }
}
