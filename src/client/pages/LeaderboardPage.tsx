import { useEffect, useMemo, useState } from 'react';
import { getLeagueDays, getPlayers } from '../api';
import { LeagueDay, Player } from '../types';
import { computeMoneyList, formatMoney, isRoundComplete } from '../utils/money';
import { playerLabel } from '../utils/playerName';

type SortKey = 'name' | 'roundsPlayed' | 'moneyWon' | 'avgScore';
type SortDirection = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Golfer' },
  { key: 'roundsPlayed', label: 'Rounds Played' },
  { key: 'moneyWon', label: 'Money Won' },
  { key: 'avgScore', label: 'Avg Score' },
];

type LeaderboardRow = {
  player: Player;
  roundsPlayed: number;
  moneyWon: number;
  avgScore: number | undefined;
};

function sortValue(row: LeaderboardRow, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return playerLabel(row.player).toLowerCase();
    case 'roundsPlayed':
      return row.roundsPlayed;
    case 'avgScore':
      // Golfers with no average sort to the bottom regardless of direction.
      return row.avgScore ?? Number.POSITIVE_INFINITY;
    default:
      return row.moneyWon;
  }
}

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [leagueDays, setLeagueDays] = useState<LeagueDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('moneyWon');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    Promise.all([getPlayers(), getLeagueDays()])
      .then(([playersResult, leagueDaysResult]) => {
        setPlayers(playersResult);
        setLeagueDays(leagueDaysResult);
      })
      .catch(() => setError('Unable to load the leaderboard.'));
  }, []);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'name' ? 'asc' : 'desc');
    }
  };

  const rows = useMemo(() => {
    const roundsPlayed = new Map<string, number>();
    const moneyWon = new Map<string, number>();
    const scores = new Map<string, number[]>();

    for (const day of leagueDays) {
      if (day.teams.length === 0) continue;

      for (const team of day.teams) {
        for (const entry of team.players) {
          roundsPlayed.set(entry.playerId, (roundsPlayed.get(entry.playerId) ?? 0) + 1);
          if (entry.frontScore !== undefined && entry.backScore !== undefined) {
            const list = scores.get(entry.playerId) ?? [];
            list.push(entry.frontScore + entry.backScore);
            scores.set(entry.playerId, list);
          }
        }
      }

      // Only fully-scored rounds have settled winners — a round still in
      // progress shouldn't contribute half-determined money to the season total.
      if (isRoundComplete(day.teams)) {
        for (const moneyRow of computeMoneyList(day.teams, players)) {
          moneyWon.set(moneyRow.playerId, (moneyWon.get(moneyRow.playerId) ?? 0) + moneyRow.amount);
        }
      }
    }

    return players
      .filter((player) => roundsPlayed.has(player.id))
      .map((player): LeaderboardRow => {
        const playerScores = scores.get(player.id) ?? [];
        return {
          player,
          roundsPlayed: roundsPlayed.get(player.id) ?? 0,
          moneyWon: moneyWon.get(player.id) ?? 0,
          avgScore: playerScores.length > 0 ? playerScores.reduce((sum, value) => sum + value, 0) / playerScores.length : undefined,
        };
      });
  }, [leagueDays, players]);

  const sortedRows = useMemo(() => {
    const factor = sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const valueA = sortValue(a, sortKey);
      const valueB = sortValue(b, sortKey);
      if (valueA < valueB) return -1 * factor;
      if (valueA > valueB) return 1 * factor;
      return 0;
    });
  }, [rows, sortKey, sortDirection]);

  return (
    <div className="page-card">
      <h2 className="section-title">Leaderboard</h2>
      {error && <div className="alert">{error}</div>}
      {sortedRows.length === 0 ? (
        <p className="empty-state">No rounds played yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="table signed-up-table">
            <thead>
              <tr>
                <th>Rank</th>
                {COLUMNS.map((column) => (
                  <th key={column.key} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(column.key)}>
                    {column.label}
                    {sortKey === column.key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => (
                <tr key={row.player.id}>
                  <td>{index + 1}</td>
                  <td>{playerLabel(row.player)}</td>
                  <td>{row.roundsPlayed}</td>
                  <td>{formatMoney(row.moneyWon)}</td>
                  <td>{row.avgScore !== undefined ? row.avgScore.toFixed(1) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
