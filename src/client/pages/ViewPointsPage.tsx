import { useEffect, useState } from 'react';
import { getLeagueDays, getPlayers } from '../api';
import { todayDateString } from '../constants';
import { LeagueDay, Player, SelectedPlayer, Team } from '../types';
import { isRoundComplete } from '../utils/money';
import { compareByLastName, playerLabel } from '../utils/playerName';
import LeagueDayResults from '../components/LeagueDayResults';

const REFRESH_INTERVAL_MS = 10000;

function totalPoints(player: Player) {
  return player.frontTarget + player.backTarget;
}

// Once an entry's round is saved its target may have already moved on, so
// prefer the target frozen at save time over the player's live target.
function entryTarget(entry: SelectedPlayer, player: Player) {
  return {
    front: entry.frontTargetAtSave ?? player.frontTarget,
    back: entry.backTargetAtSave ?? player.backTarget,
  };
}

function teamPointTotals(team: Team, players: Player[]) {
  let front = 0;
  let back = 0;
  for (const entry of team.players) {
    const player = players.find((p) => p.id === entry.playerId);
    if (player) {
      const target = entryTarget(entry, player);
      front += target.front;
      back += target.back;
    }
  }
  return { front, back };
}

export default function ViewPointsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [leagueDays, setLeagueDays] = useState<LeagueDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const today = todayDateString();

  const load = () => {
    Promise.all([getPlayers(), getLeagueDays()])
      .then(([playersResult, leagueDaysResult]) => {
        setPlayers(playersResult);
        setLeagueDays(leagueDaysResult);
        setError(null);
      })
      .catch(() => setError('Unable to load points.'));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  const todayLeagueDay = leagueDays.find((day) => day.date === today) ?? null;

  const selectedPlayerIds = new Set(todayLeagueDay?.selectedPlayers.map((entry) => entry.playerId) ?? []);
  const sortedPlayers = players
    .filter((player) => selectedPlayerIds.has(player.id))
    .sort(compareByLastName);

  const teams = todayLeagueDay?.teams ?? [];
  const sortedTeams = [...teams].sort((a, b) => a.teamNumber - b.teamNumber);
  const showTeams = sortedTeams.length > 0;
  const roundComplete = isRoundComplete(teams);
  const signedUpCount = todayLeagueDay?.selectedPlayers.length ?? 0;

  return (
    <div className="page-card">
      <div className="select-players-header">
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          Points
        </h2>
        <span className="signed-up-count" title={`${signedUpCount} golfer${signedUpCount === 1 ? '' : 's'} signed up`}>
          {signedUpCount}
        </span>
      </div>
      {error && <div className="alert">{error}</div>}

      {roundComplete ? (
        <LeagueDayResults teams={teams} players={players} />
      ) : showTeams ? (
        <div className="points-board-teams">
          {sortedTeams.map((team) => {
            const totals = teamPointTotals(team, players);
            return (
              <div key={team.teamNumber} className="team-card">
                <h3>Team {team.teamNumber}</h3>
                <div className="league-day-meta" style={{ marginBottom: '0.75rem' }}>
                  <span className="meta-chip meta-chip-accent">Front Total {totals.front}</span>
                  <span className="meta-chip meta-chip-accent">Back Total {totals.back}</span>
                </div>
                {team.players.map((entry) => {
                  const player = players.find((p) => p.id === entry.playerId);
                  if (!player) return null;
                  const target = entryTarget(entry, player);
                  const totalScore =
                    entry.frontScore !== undefined && entry.backScore !== undefined
                      ? entry.frontScore + entry.backScore
                      : undefined;
                  return (
                    <div key={entry.playerId} className="points-board-item">
                      <span className="points-board-name">{playerLabel(player)}</span>
                      <div className="points-board-row">
                        <span className="points-board-row-label">Needed</span>
                        <span className="points-board-stats">
                          <span className="points-board-stat">
                            <b>F</b>
                            {target.front}
                          </span>
                          <span className="points-board-stat">
                            <b>B</b>
                            {target.back}
                          </span>
                          <span className="points-board-stat points-value">
                            <b>T</b>
                            {target.front + target.back}
                          </span>
                        </span>
                      </div>
                      <div className="points-board-row">
                        <span className="points-board-row-label">Score</span>
                        <span className="points-board-stats points-board-scores">
                          <span className="points-board-stat">
                            <b>F</b>
                            {entry.frontScore ?? '–'}
                          </span>
                          <span className="points-board-stat">
                            <b>B</b>
                            {entry.backScore ?? '–'}
                          </span>
                          <span className="points-board-stat points-value">
                            <b>T</b>
                            {totalScore ?? '–'}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : sortedPlayers.length === 0 ? (
        <p className="empty-state">No golfers signed up for today yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="table signed-up-table">
            <thead>
              <tr>
                <th>Golfer</th>
                <th>Front</th>
                <th>Back</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player) => (
                <tr key={player.id}>
                  <td>{playerLabel(player)}</td>
                  <td>{player.frontTarget}</td>
                  <td>{player.backTarget}</td>
                  <td>{totalPoints(player)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
