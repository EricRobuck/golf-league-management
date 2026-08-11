import { useMemo } from 'react';
import { todayDateString } from '../constants';
import { Player, Team } from '../types';
import {
  computeMoneyList,
  findWinners,
  formatMoney,
  hasAnyScore,
  teamBackTotal,
  teamDiffTotals,
  teamFrontTotal,
  teamTotal,
} from '../utils/money';
import { playerLabel } from '../utils/playerName';

function formatDiff(value: number | undefined) {
  if (value === undefined) return '-';
  if (value > 0) return `+${value}`;
  return String(value);
}

export default function LeagueDayResults({ teams, players, date }: { teams: Team[]; players: Player[]; date: string }) {
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => teamDiffTotals(b, players).totalDiff - teamDiffTotals(a, players).totalDiff),
    [teams, players]
  );

  const frontHasScores = hasAnyScore(sortedTeams, 'frontScore');
  const backHasScores = hasAnyScore(sortedTeams, 'backScore');
  const totalHasScores = frontHasScores || backHasScores;

  const frontWinners = useMemo(() => findWinners(sortedTeams, players, 'frontDiff'), [sortedTeams, players]);
  const backWinners = useMemo(() => findWinners(sortedTeams, players, 'backDiff'), [sortedTeams, players]);
  const totalWinners = useMemo(() => findWinners(sortedTeams, players, 'totalDiff'), [sortedTeams, players]);

  const playerCount = useMemo(
    () => new Set(sortedTeams.flatMap((team) => team.players.map((entry) => entry.playerId))).size,
    [sortedTeams]
  );
  const categoryPot = playerCount; // $3 per golfer, split evenly across front/back/total

  const moneyList = useMemo(() => computeMoneyList(sortedTeams, players), [sortedTeams, players]);

  if (sortedTeams.length === 0) {
    return <p className="empty-state">No teams yet — create the round first.</p>;
  }

  if (date !== todayDateString()) {
    return <p className="empty-state">Results are only available on the day the round was played.</p>;
  }

  return (
    <>
      <div className="winners-grid">
        <div className="winner-card">
          <div className="winner-label">Front Winner</div>
          {frontHasScores ? (
            <>
              <div className="winner-team">{frontWinners.teams.map((team) => `Team ${team.teamNumber}`).join(' & ')}</div>
              <div className="winner-diff">{formatDiff(frontWinners.value)}</div>
            </>
          ) : (
            <div className="winner-empty">No scores yet</div>
          )}
          <div className="winner-pot">{formatMoney(categoryPot)} available</div>
        </div>
        <div className="winner-card">
          <div className="winner-label">Back Winner</div>
          {backHasScores ? (
            <>
              <div className="winner-team">{backWinners.teams.map((team) => `Team ${team.teamNumber}`).join(' & ')}</div>
              <div className="winner-diff">{formatDiff(backWinners.value)}</div>
            </>
          ) : (
            <div className="winner-empty">No scores yet</div>
          )}
          <div className="winner-pot">{formatMoney(categoryPot)} available</div>
        </div>
        <div className="winner-card">
          <div className="winner-label">Total Winner</div>
          {totalHasScores ? (
            <>
              <div className="winner-team">{totalWinners.teams.map((team) => `Team ${team.teamNumber}`).join(' & ')}</div>
              <div className="winner-diff">{formatDiff(totalWinners.value)}</div>
            </>
          ) : (
            <div className="winner-empty">No scores yet</div>
          )}
          <div className="winner-pot">{formatMoney(categoryPot)} available</div>
        </div>
      </div>

      <div className="page-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Money Won</h3>
        {moneyList.length === 0 ? (
          <p className="empty-state">No money awarded yet — enter scores to determine winners.</p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Golfer</th>
                  <th>Money Won</th>
                </tr>
              </thead>
              <tbody>
                {moneyList.map(({ playerId, player, teamNumber, amount, categoriesWon }) => (
                  <tr key={playerId}>
                    <td>
                      {player ? playerLabel(player) : playerId} — Team {teamNumber} ({categoriesWon.join(', ')})
                    </td>
                    <td>{formatMoney(amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="team-grid">
        {sortedTeams.map((team) => {
          const front = teamFrontTotal(team);
          const back = teamBackTotal(team);
          const total = teamTotal(team);
          const diffTotals = teamDiffTotals(team, players);
          return (
            <div key={team.teamNumber} className="team-card">
              <h3>Team {team.teamNumber}</h3>
              <div className="league-day-meta" style={{ marginBottom: '0.75rem' }}>
                <span className="meta-chip meta-chip-accent">Front Total {front}</span>
                <span className="meta-chip meta-chip-accent">Back Total {back}</span>
                <span className="meta-chip meta-chip-accent">Total Points {total}</span>
              </div>
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Golfer</th>
                      <th>Front</th>
                      <th>Back</th>
                      <th>Front +/-</th>
                      <th>Back +/-</th>
                      <th>Total +/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.players.map((entry) => {
                      const player = players.find((p) => p.id === entry.playerId);
                      const frontDiff = player && entry.frontScore !== undefined ? entry.frontScore - player.frontTarget : undefined;
                      const backDiff = player && entry.backScore !== undefined ? entry.backScore - player.backTarget : undefined;
                      const totalDiff = frontDiff !== undefined && backDiff !== undefined ? frontDiff + backDiff : undefined;
                      return (
                        <tr key={entry.playerId}>
                          <td>{player ? playerLabel(player) : entry.playerId}</td>
                          <td>{entry.frontScore ?? '-'}</td>
                          <td>{entry.backScore ?? '-'}</td>
                          <td>{formatDiff(frontDiff)}</td>
                          <td>{formatDiff(backDiff)}</td>
                          <td>{formatDiff(totalDiff)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 700, background: '#f8fafc' }}>
                      <td>Total</td>
                      <td>{front}</td>
                      <td>{back}</td>
                      <td>{formatDiff(diffTotals.frontDiff)}</td>
                      <td>{formatDiff(diffTotals.backDiff)}</td>
                      <td>{formatDiff(diffTotals.totalDiff)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
