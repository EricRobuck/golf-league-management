import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getLeagueDay, getPlayers } from '../api';
import { LeagueDay, Player, SelectedPlayer, Team } from '../types';

function playerLabel(player: Player) {
  return `${player.firstName} ${player.lastName}`;
}

function teamFrontTotal(team: Team) {
  return team.players.reduce((total, entry) => total + (entry.frontScore ?? 0), 0);
}

function teamBackTotal(team: Team) {
  return team.players.reduce((total, entry) => total + (entry.backScore ?? 0), 0);
}

function teamTotal(team: Team) {
  return teamFrontTotal(team) + teamBackTotal(team);
}

function formatDiff(value: number | undefined) {
  if (value === undefined) return '-';
  if (value > 0) return `+${value}`;
  return String(value);
}

function teamDiffTotals(team: Team, players: Player[]) {
  let frontDiff = 0;
  let backDiff = 0;
  for (const entry of team.players) {
    const player = players.find((p) => p.id === entry.playerId);
    if (!player) continue;
    if (entry.frontScore !== undefined) frontDiff += entry.frontScore - player.frontTarget;
    if (entry.backScore !== undefined) backDiff += entry.backScore - player.backTarget;
  }
  return { frontDiff, backDiff, totalDiff: frontDiff + backDiff };
}

type DiffKey = 'frontDiff' | 'backDiff' | 'totalDiff';

function findWinners(teams: Team[], players: Player[], key: DiffKey) {
  const withDiffs = teams.map((team) => ({ team, diffs: teamDiffTotals(team, players) }));
  const best = Math.max(...withDiffs.map((entry) => entry.diffs[key]));
  return {
    teams: withDiffs.filter((entry) => entry.diffs[key] === best).map((entry) => entry.team),
    value: best,
  };
}

function hasAnyScore(teams: Team[], field: 'frontScore' | 'backScore') {
  return teams.some((team) => team.players.some((entry) => entry[field] !== undefined));
}

function individualDiff(entry: SelectedPlayer, player: Player | undefined, category: 'front' | 'back' | 'total') {
  if (!player) return undefined;
  if (category === 'front') return entry.frontScore !== undefined ? entry.frontScore - player.frontTarget : undefined;
  if (category === 'back') return entry.backScore !== undefined ? entry.backScore - player.backTarget : undefined;
  const front = entry.frontScore !== undefined ? entry.frontScore - player.frontTarget : undefined;
  const back = entry.backScore !== undefined ? entry.backScore - player.backTarget : undefined;
  return front !== undefined && back !== undefined ? front + back : undefined;
}

function formatMoney(amount: number) {
  return `$${amount}`;
}

// A team's winnings across every category it won are pooled into a single lump sum and
// split evenly across its own members in one pass, so no teammate can end up more than
// $1 apart from another. (Splitting front/back/total separately would let the same top
// performer collect the leftover dollar in each category, compounding into a bigger gap.)
// When the lump sum doesn't divide evenly, the extra dollars go to whichever teammates
// had the better individual differential overall.
function distributeTeamMoney(team: Team, players: Player[], pot: number) {
  const members = team.players;
  const payouts: Record<string, number> = {};
  if (members.length === 0 || pot === 0) return payouts;

  const base = Math.floor(pot / members.length);
  const remainder = pot - base * members.length;

  for (const entry of members) {
    payouts[entry.playerId] = base;
  }

  const ordered = [...members].sort((a, b) => {
    const playerA = players.find((p) => p.id === a.playerId);
    const playerB = players.find((p) => p.id === b.playerId);
    const diffA = individualDiff(a, playerA, 'total') ?? -Infinity;
    const diffB = individualDiff(b, playerB, 'total') ?? -Infinity;
    return diffB - diffA;
  });

  for (let i = 0; i < remainder; i += 1) {
    payouts[ordered[i].playerId] += 1;
  }

  return payouts;
}

export default function TeamScoresPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leagueDay, setLeagueDay] = useState<LeagueDay | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getLeagueDay(id)
      .then(setLeagueDay)
      .catch(() => setError('Unable to load league day.'));
    getPlayers()
      .then(setPlayers)
      .catch(() => setError('Unable to load players.'));
  }, [id]);

  const sortedTeams = useMemo(() => {
    if (!leagueDay) return [];
    return [...leagueDay.teams].sort(
      (a, b) => teamDiffTotals(b, players).totalDiff - teamDiffTotals(a, players).totalDiff
    );
  }, [leagueDay, players]);

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

  const moneyList = useMemo(() => {
    const frontWinnerNumbers = new Set(frontWinners.teams.map((team) => team.teamNumber));
    const backWinnerNumbers = new Set(backWinners.teams.map((team) => team.teamNumber));
    const totalWinnerNumbers = new Set(totalWinners.teams.map((team) => team.teamNumber));

    const rows: { playerId: string; player: Player | undefined; teamNumber: number; amount: number; categoriesWon: string[] }[] = [];

    for (const team of sortedTeams) {
      const wonFront = frontHasScores && frontWinnerNumbers.has(team.teamNumber);
      const wonBack = backHasScores && backWinnerNumbers.has(team.teamNumber);
      const wonTotal = totalHasScores && totalWinnerNumbers.has(team.teamNumber);
      const pot = (wonFront ? categoryPot : 0) + (wonBack ? categoryPot : 0) + (wonTotal ? categoryPot : 0);
      if (pot === 0) continue;

      const categoriesWon = [
        wonFront ? 'Front' : null,
        wonBack ? 'Back' : null,
        wonTotal ? 'Total' : null,
      ].filter((label): label is string => label !== null);

      const payouts = distributeTeamMoney(team, players, pot);
      for (const entry of team.players) {
        const amount = payouts[entry.playerId] ?? 0;
        if (amount <= 0) continue;
        rows.push({
          playerId: entry.playerId,
          player: players.find((p) => p.id === entry.playerId),
          teamNumber: team.teamNumber,
          amount,
          categoriesWon,
        });
      }
    }

    return rows;
  }, [sortedTeams, players, categoryPot, frontHasScores, backHasScores, totalHasScores, frontWinners, backWinners, totalWinners]);

  if (!leagueDay) {
    return (
      <div className="page-card">
        <p>Loading league day...</p>
      </div>
    );
  }

  return (
    <div className="page-card">
      <h2 className="section-title">Team Scores</h2>
      <div className="league-day-meta" style={{ marginBottom: '1rem' }}>
        <span className="meta-chip">{leagueDay.date}</span>
      </div>
      {error && <div className="alert">{error}</div>}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="button secondary" onClick={() => navigate(`/league-days/${id}/teams`)}>
          Enter More Scores
        </button>
      </div>

      {sortedTeams.length === 0 ? (
        <p className="empty-state">No teams yet — create the round first.</p>
      ) : (
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
      )}

      {sortedTeams.length > 0 && (
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
      )}

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

      <div style={{ marginTop: '1rem' }}>
        <Link className="button secondary" to="/league-days">
          Back to League Days
        </Link>
      </div>
    </div>
  );
}
