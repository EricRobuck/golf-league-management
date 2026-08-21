import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getLeagueDays, getPlayers } from '../api';
import { LeagueDay, Player } from '../types';
import { compareByLastName, playerLabel } from '../utils/playerName';
import ScoreTrendChart from '../components/ScoreTrendChart';

type PairingRow = { player: Player; count: number };
type RoundRow = { date: string; front: number; back: number; total: number };

export default function PlayerStatsPage() {
  const { id } = useParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [leagueDays, setLeagueDays] = useState<LeagueDay[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getPlayers(), getLeagueDays()])
      .then(([playersResult, leagueDaysResult]) => {
        setPlayers(playersResult);
        setLeagueDays(leagueDaysResult);
      })
      .catch(() => setError('Unable to load stats.'));
  }, []);

  const player = players.find((p) => p.id === id);

  const stats = useMemo(() => {
    if (!id) return null;

    const pairingCounts = new Map<string, number>();
    let firstCount = 0;
    let lastCount = 0;
    let roundsPlayed = 0;
    const totalScores: number[] = [];
    const nineScores: number[] = [];
    const recentRounds: RoundRow[] = [];

    for (const day of leagueDays) {
      if (day.teams.length === 0) continue;
      const teamIndex = day.teams.findIndex((team) => team.players.some((entry) => entry.playerId === id));
      if (teamIndex === -1) continue;

      roundsPlayed += 1;
      const team = day.teams[teamIndex];
      if (teamIndex === 0) firstCount += 1;
      if (teamIndex === day.teams.length - 1) lastCount += 1;

      for (const entry of team.players) {
        if (entry.playerId === id) continue;
        pairingCounts.set(entry.playerId, (pairingCounts.get(entry.playerId) ?? 0) + 1);
      }

      const myEntry = team.players.find((entry) => entry.playerId === id);
      if (myEntry && myEntry.frontScore !== undefined && myEntry.backScore !== undefined) {
        totalScores.push(myEntry.frontScore + myEntry.backScore);
        nineScores.push(myEntry.frontScore, myEntry.backScore);
        recentRounds.push({ date: day.date, front: myEntry.frontScore, back: myEntry.backScore, total: myEntry.frontScore + myEntry.backScore });
      }
    }

    recentRounds.sort((a, b) => b.date.localeCompare(a.date));

    const pairings: PairingRow[] = [...pairingCounts.entries()]
      .map(([playerId, count]) => {
        const teammate = players.find((p) => p.id === playerId);
        return teammate ? { player: teammate, count } : null;
      })
      .filter((row): row is PairingRow => row !== null)
      .sort((a, b) => b.count - a.count || compareByLastName(a.player, b.player));

    return {
      roundsPlayed,
      firstCount,
      lastCount,
      averageScore: totalScores.length > 0 ? totalScores.reduce((sum, value) => sum + value, 0) / totalScores.length : undefined,
      highestNine: nineScores.length > 0 ? Math.max(...nineScores) : undefined,
      lowestNine: nineScores.length > 0 ? Math.min(...nineScores) : undefined,
      pairings,
      recentRounds,
    };
  }, [id, leagueDays, players]);

  if (error) {
    return (
      <div className="page-card">
        <div className="alert">{error}</div>
      </div>
    );
  }

  if (!player || !stats) {
    return (
      <div className="page-card">
        <p>Loading stats...</p>
      </div>
    );
  }

  return (
    <div className="page-card">
      <div className="select-players-header">
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          {playerLabel(player)} — Stats
        </h2>
        <Link className="button secondary" to="/players">
          Back to Players
        </Link>
      </div>

      <div className="league-day-meta" style={{ marginTop: '1rem' }}>
        <span className="meta-chip">Rounds Played {stats.roundsPlayed}</span>
        <span className="meta-chip meta-chip-accent">
          Avg Score {stats.averageScore !== undefined ? stats.averageScore.toFixed(1) : '–'}
        </span>
        <span className="meta-chip">Highest 9 {stats.highestNine ?? '–'}</span>
        <span className="meta-chip">Lowest 9 {stats.lowestNine ?? '–'}</span>
        <span className="meta-chip">Went First {stats.firstCount}</span>
        <span className="meta-chip">Went Last {stats.lastCount}</span>
      </div>

      <h3 style={{ marginTop: '1.75rem' }}>Score Trend</h3>
      {stats.recentRounds.length === 0 ? (
        <p className="empty-state">No scores entered yet.</p>
      ) : (
        <ScoreTrendChart points={[...stats.recentRounds].reverse()} />
      )}

      <h3 style={{ marginTop: '1.75rem' }}>Recent Rounds</h3>
      {stats.recentRounds.length === 0 ? (
        <p className="empty-state">No scores entered yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="table signed-up-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Front</th>
                <th>Back</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentRounds.map((round) => (
                <tr key={round.date}>
                  <td>{round.date}</td>
                  <td>{round.front}</td>
                  <td>{round.back}</td>
                  <td>{round.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ marginTop: '1.75rem' }}>Played With</h3>
      {stats.pairings.length === 0 ? (
        <p className="empty-state">No rounds played with anyone yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="table signed-up-table">
            <thead>
              <tr>
                <th>Golfer</th>
                <th>Times Played Together</th>
              </tr>
            </thead>
            <tbody>
              {stats.pairings.map(({ player: teammate, count }) => (
                <tr key={teammate.id}>
                  <td>{playerLabel(teammate)}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
