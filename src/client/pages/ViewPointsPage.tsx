import { useEffect, useState } from 'react';
import { getLeagueDays, getPlayers } from '../api';
import { todayDateString } from '../constants';
import { LeagueDay, Player, Team } from '../types';

const REFRESH_INTERVAL_MS = 10000;

function playerLabel(player: Player) {
  return `${player.firstName} ${player.lastName}`;
}

function totalPoints(player: Player) {
  return player.frontTarget + player.backTarget;
}

function teamPointsTotal(team: Team, players: Player[]) {
  let total = 0;
  for (const entry of team.players) {
    const player = players.find((p) => p.id === entry.playerId);
    if (player) total += totalPoints(player);
  }
  return total;
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
    .sort((a, b) => (a.lastName === b.lastName ? a.firstName.localeCompare(b.firstName) : a.lastName.localeCompare(b.lastName)));

  const teams = todayLeagueDay?.teams ?? [];
  const sortedTeams = [...teams].sort((a, b) => a.teamNumber - b.teamNumber);
  const showTeams = sortedTeams.length > 0;

  return (
    <div className="page-card">
      <h2 className="section-title">Points</h2>
      {error && <div className="alert">{error}</div>}

      {showTeams ? (
        <div className="points-board-teams">
          {sortedTeams.map((team) => (
            <div key={team.teamNumber} className="team-card">
              <h3>Team {team.teamNumber}</h3>
              {team.players.map((entry) => {
                const player = players.find((p) => p.id === entry.playerId);
                if (!player) return null;
                return (
                  <div key={entry.playerId} className="points-board-item">
                    <span className="points-board-name">{playerLabel(player)}</span>
                    <span className="points-board-stats">
                      <span className="points-board-stat">
                        <b>F</b>
                        {player.frontTarget}
                      </span>
                      <span className="points-board-stat">
                        <b>B</b>
                        {player.backTarget}
                      </span>
                      <span className="points-board-stat points-value">
                        <b>T</b>
                        {totalPoints(player)}
                      </span>
                    </span>
                  </div>
                );
              })}
              <div className="points-board-team-total">
                <span>Team Total</span>
                <span>{teamPointsTotal(team, players)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : sortedPlayers.length === 0 ? (
        <p className="empty-state">No golfers signed up for today yet.</p>
      ) : (
        <div className="points-board-grid">
          {sortedPlayers.map((player) => (
            <div key={player.id} className="points-board-item">
              <span className="points-board-name">{playerLabel(player)}</span>
              <span className="points-board-stats">
                <span className="points-board-stat">
                  <b>F</b>
                  {player.frontTarget}
                </span>
                <span className="points-board-stat">
                  <b>B</b>
                  {player.backTarget}
                </span>
                <span className="points-board-stat points-value">
                  <b>T</b>
                  {totalPoints(player)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
