import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getLeagueDay, getPlayers, patchPlayer, updateLeagueDayTeams } from '../api';
import { LeagueDay, Player, Team } from '../types';
import { adjustTargets } from '../utils/targetAdjustment';
import { playerLabel } from '../utils/playerName';
import DailyMessageEditor from '../components/DailyMessageEditor';

function findPlayer(players: Player[], playerId: string) {
  return players.find((player) => player.id === playerId);
}

function normalizeTeams(teams: Team[]) {
  return teams.map((team, index) => ({ ...team, teamNumber: index + 1 }));
}

function teamTotals(team: Team, players: Player[]) {
  const totals = team.players.reduce(
    (acc, entry) => {
      const player = findPlayer(players, entry.playerId);
      return {
        front: acc.front + (player?.frontTarget ?? 0),
        back: acc.back + (player?.backTarget ?? 0),
      };
    },
    { front: 0, back: 0 }
  );
  return { ...totals, total: totals.front + totals.back };
}

export default function GeneratedTeamsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leagueDay, setLeagueDay] = useState<LeagueDay | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dirtyTeams, setDirtyTeams] = useState<Set<number>>(new Set());
  const [savingTeam, setSavingTeam] = useState<number | null>(null);
  const [savedTeam, setSavedTeam] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    getLeagueDay(id)
      .then(setLeagueDay)
      .catch(() => setError('Unable to load league day.'));
    getPlayers()
      .then(setPlayers)
      .catch(() => setError('Unable to load players.'));
  }, [id]);

  const selectedPlayers = useMemo(() => leagueDay?.selectedPlayers ?? [], [leagueDay]);
  const teams = useMemo(() => leagueDay?.teams ?? [], [leagueDay]);

  const updateLocalTeams = (updatedTeams: Team[], changedTeamNumber: number) => {
    setLeagueDay((current) => (current ? { ...current, teams: normalizeTeams(updatedTeams) } : current));
    setDirtyTeams((current) => new Set(current).add(changedTeamNumber));
    setSavedTeam((current) => (current === changedTeamNumber ? null : current));
  };

  const removePlayerFromTeam = (teamIndex: number, playerIndex: number) => {
    if (!leagueDay) return;
    const updatedTeams = [...teams];
    const sourceTeam = { ...updatedTeams[teamIndex], players: [...updatedTeams[teamIndex].players] };
    sourceTeam.players.splice(playerIndex, 1);
    updatedTeams[teamIndex] = sourceTeam;
    updateLocalTeams(updatedTeams, sourceTeam.teamNumber);
  };

  const handleScoreChange = (teamIndex: number, playerIndex: number, field: 'frontScore' | 'backScore', value: string) => {
    if (!leagueDay) return;
    const updatedTeams = [...teams];
    const team = { ...updatedTeams[teamIndex], players: [...updatedTeams[teamIndex].players] };
    const entry = { ...team.players[playerIndex], [field]: value === '' ? undefined : Number(value) };
    team.players[playerIndex] = entry;
    updatedTeams[teamIndex] = team;
    updateLocalTeams(updatedTeams, team.teamNumber);
  };

  const handleSaveTeam = async (teamNumber: number) => {
    if (!id || !leagueDay) return;
    const targetTeam = teams.find((team) => team.teamNumber === teamNumber);
    if (!targetTeam) return;

    for (const entry of targetTeam.players) {
      for (const value of [entry.frontScore, entry.backScore]) {
        if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
          setError('Scores must be non-negative whole numbers.');
          return;
        }
      }
    }

    setSavingTeam(teamNumber);
    setError(null);
    try {
      const targetPatches: Promise<Player>[] = [];
      const normalized = normalizeTeams(teams).map((team) => {
        if (team.teamNumber !== teamNumber) return team;
        return {
          ...team,
          players: team.players.map((entry) => {
            const player = findPlayer(players, entry.playerId);
            if (!player || entry.frontScore === undefined || entry.backScore === undefined || entry.targetAdjusted) {
              return entry;
            }
            const { frontTarget, backTarget } = adjustTargets(player, entry.frontScore, entry.backScore);
            const patch: Partial<Player> = {};
            if (frontTarget !== player.frontTarget) patch.frontTarget = frontTarget;
            if (backTarget !== player.backTarget) patch.backTarget = backTarget;
            if (Object.keys(patch).length > 0) {
              targetPatches.push(patchPlayer(entry.playerId, patch));
            }
            return {
              ...entry,
              targetAdjusted: true,
              frontTargetAtSave: player.frontTarget,
              backTargetAtSave: player.backTarget,
            };
          }),
        };
      });

      await updateLeagueDayTeams(id, normalized);
      await Promise.all(targetPatches);

      setLeagueDay((current) => (current ? { ...current, teams: normalized } : current));
      setDirtyTeams((current) => {
        const next = new Set(current);
        next.delete(teamNumber);
        return next;
      });
      setSavedTeam(teamNumber);
    } catch (_error) {
      setError('Unable to save.');
    } finally {
      setSavingTeam(null);
    }
  };

  const canPrint = () => teams.length > 0;

  if (!leagueDay) {
    return (
      <div className="page-card">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-card generated-teams-page">
      {error && <div className="alert">{error}</div>}
      <DailyMessageEditor date={leagueDay.date} />
      <div className="page-toolbar">
        <button className="button secondary" onClick={() => navigate(`/league-days/${id}/select`)}>
          Role Call
        </button>
        <button className="button secondary" onClick={() => window.print()} disabled={!canPrint()}>
          Print Teams
        </button>
        <Link className="button secondary" to={`/league-days/${id}/scores`}>
          View Team Scores
        </Link>
        <Link className="button secondary" to="/players/add">
          Add Player
        </Link>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <strong>League Date:</strong> {leagueDay.date} · <strong>Players:</strong> {selectedPlayers.length}
      </div>
      {teams.length > 0 ? (
        <div className="team-grid">
          {teams.map((team, teamIndex) => {
            const totals = teamTotals(team, players);
            return (
              <div key={team.teamNumber} className="team-card">
                <h3>Team {team.teamNumber} — {team.players.length === 3 ? 'Threesome' : 'Foursome'}</h3>
                <div className="league-day-meta" style={{ marginBottom: '0.75rem' }}>
                  <span className="meta-chip">Size {team.players.length}</span>
                  <span className="meta-chip meta-chip-accent">Front Total {totals.front}</span>
                  <span className="meta-chip meta-chip-accent">Back Total {totals.back}</span>
                  <span className="meta-chip meta-chip-accent">Total Points Needed {totals.total}</span>
                </div>
                <div className="table-scroll">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Golfer</th>
                        <th>Front</th>
                        <th>Back</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.players.map((entry, playerIndex) => {
                        const player = findPlayer(players, entry.playerId);
                        return (
                          <tr key={entry.playerId}>
                            <td>
                              {player ? playerLabel(player) : entry.playerId}
                              <div className="player-meta">
                                Target: Front {player?.frontTarget ?? '-'} / Back {player?.backTarget ?? '-'}
                              </div>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                style={{ width: '4.5rem' }}
                                value={entry.frontScore ?? ''}
                                onChange={(event) => handleScoreChange(teamIndex, playerIndex, 'frontScore', event.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                style={{ width: '4.5rem' }}
                                value={entry.backScore ?? ''}
                                onChange={(event) => handleScoreChange(teamIndex, playerIndex, 'backScore', event.target.value)}
                              />
                            </td>
                            <td>
                              <button
                                className="button secondary"
                                style={{ background: '#dc2626' }}
                                onClick={() => {
                                  const name = player ? playerLabel(player) : 'this golfer';
                                  if (window.confirm(`Remove ${name} from Team ${team.teamNumber}?`)) {
                                    removePlayerFromTeam(teamIndex, playerIndex);
                                  }
                                }}
                              >
                                →
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    className="button"
                    onClick={() => handleSaveTeam(team.teamNumber)}
                    disabled={savingTeam === team.teamNumber || !dirtyTeams.has(team.teamNumber)}
                  >
                    {savingTeam === team.teamNumber ? 'Saving...' : 'Save Team'}
                  </button>
                  {savedTeam === team.teamNumber && <span className="unsaved-note" style={{ color: '#15803d' }}>Saved!</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p>No teams generated yet.</p>
      )}
    </div>
  );
}
