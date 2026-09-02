import { useEffect, useMemo, useState } from 'react';
import { getLeagueDays, getPlayers } from '../api';
import { LeagueDay, Player } from '../types';
import { playerLabel } from '../utils/playerName';

type Period = 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
};

function formatDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rangeStart(period: Period, today: Date): string {
  const d = new Date(today);
  if (period === 'week') {
    const dayOfWeek = d.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    d.setDate(d.getDate() - diffToMonday);
  } else if (period === 'month') {
    d.setDate(1);
  } else {
    d.setMonth(0, 1);
  }
  return formatDate(d);
}

type ScoreEntry = { playerId: string; date: string; front: number; back: number; total: number };

type HighRecord = { value: number; holders: { playerId: string; date: string }[] };

function computeHigh(entries: ScoreEntry[], key: 'front' | 'back' | 'total'): HighRecord | null {
  if (entries.length === 0) return null;
  const value = Math.max(...entries.map((entry) => entry[key]));
  const holders = entries.filter((entry) => entry[key] === value).map((entry) => ({ playerId: entry.playerId, date: entry.date }));
  return { value, holders };
}

function average(entries: ScoreEntry[], key: 'front' | 'back' | 'total'): number | undefined {
  if (entries.length === 0) return undefined;
  return entries.reduce((sum, entry) => sum + entry[key], 0) / entries.length;
}

export default function GroupStatsPage() {
  const [leagueDays, setLeagueDays] = useState<LeagueDay[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('week');

  useEffect(() => {
    Promise.all([getLeagueDays(), getPlayers()])
      .then(([leagueDaysResult, playersResult]) => {
        setLeagueDays(leagueDaysResult);
        setPlayers(playersResult);
      })
      .catch(() => setError('Unable to load group stats.'));
  }, []);

  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  const entries = useMemo(() => {
    const today = new Date();
    const start = rangeStart(period, today);
    const end = formatDate(today);
    const rows: ScoreEntry[] = [];
    for (const day of leagueDays) {
      if (day.date < start || day.date > end) continue;
      for (const team of day.teams) {
        for (const entry of team.players) {
          if (entry.frontScore === undefined || entry.backScore === undefined) continue;
          rows.push({
            playerId: entry.playerId,
            date: day.date,
            front: entry.frontScore,
            back: entry.backScore,
            total: entry.frontScore + entry.backScore,
          });
        }
      }
    }
    return rows;
  }, [leagueDays, period]);

  const stats = useMemo(
    () => ({
      front: { high: computeHigh(entries, 'front'), avg: average(entries, 'front') },
      back: { high: computeHigh(entries, 'back'), avg: average(entries, 'back') },
      total: { high: computeHigh(entries, 'total'), avg: average(entries, 'total') },
    }),
    [entries]
  );

  const holderLabel = (holders: { playerId: string; date: string }[]) =>
    holders
      .map(({ playerId, date }) => {
        const player = byId.get(playerId);
        return `${player ? playerLabel(player) : playerId} (${date})`;
      })
      .join(' & ');

  const rows: { label: string; key: 'front' | 'back' | 'total' }[] = [
    { label: 'Front', key: 'front' },
    { label: 'Back', key: 'back' },
    { label: 'Total', key: 'total' },
  ];

  return (
    <div className="page-card">
      <h2 className="section-title">Group Stats</h2>
      {error && <div className="alert">{error}</div>}

      <div className="form-field" style={{ maxWidth: '16rem', marginBottom: '1.25rem' }}>
        <label>Period</label>
        <select value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
        </select>
      </div>

      {entries.length === 0 ? (
        <p className="empty-state">No scores entered for {PERIOD_LABELS[period].toLowerCase()} yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="table signed-up-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Highest</th>
                <th>Achieved By</th>
                <th>Average</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, key }) => {
                const { high, avg } = stats[key];
                return (
                  <tr key={key}>
                    <td>{label}</td>
                    <td>{high ? high.value : '–'}</td>
                    <td>{high ? holderLabel(high.holders) : '–'}</td>
                    <td>{avg !== undefined ? avg.toFixed(1) : '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
