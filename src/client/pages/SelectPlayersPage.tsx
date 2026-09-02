import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addLeagueDayPlayer,
  generateLeagueDayTeams,
  getLeagueDay,
  getPlayers,
  removeLeagueDayPlayer,
  updateLeagueDayPlayerOrder,
  updateLeagueDayTeams,
} from '../api';
import { LeagueDay, Player, SelectedPlayer, Team } from '../types';
import { playerLabel } from '../utils/playerName';
import { useIsMobile } from '../hooks/useIsMobile';
import { useCurrentPlayer } from '../context/CurrentPlayerContext';

const REFRESH_INTERVAL_MS = 12000;

type LateEntryPlan = { teams: Team[]; targetTeamNumber: number; createdNewTeam: boolean };

// A late arrival goes on the bottom of the last threesome, turning it into a
// foursome. If every team is already a foursome, the last player from each
// of the first three teams is pulled off to form a brand new team with the
// late entry, rather than overloading any one team to five.
function planLateEntry(teams: Team[], newEntry: SelectedPlayer): LateEntryPlan {
  const cloned = teams.map((team) => ({ ...team, players: [...team.players] }));
  const lastThreesomeIndex = cloned.reduce(
    (lastIndex, team, index) => (team.players.length === 3 ? index : lastIndex),
    -1
  );

  if (lastThreesomeIndex !== -1) {
    cloned[lastThreesomeIndex].players.push(newEntry);
    return { teams: cloned, targetTeamNumber: cloned[lastThreesomeIndex].teamNumber, createdNewTeam: false };
  }

  const pulled: SelectedPlayer[] = [];
  for (let i = 0; i < Math.min(3, cloned.length); i += 1) {
    const removed = cloned[i].players.pop();
    if (removed) pulled.push(removed);
  }
  const newTeamNumber = cloned.length + 1;
  cloned.push({ teamNumber: newTeamNumber, players: [...pulled, newEntry] });
  return { teams: cloned, targetTeamNumber: newTeamNumber, createdNewTeam: true };
}

export default function SelectPlayersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentPlayer } = useCurrentPlayer();
  const [leagueDay, setLeagueDay] = useState<LeagueDay | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!id) return;
    const load = () => {
      getLeagueDay(id)
        .then(setLeagueDay)
        .catch(() => setError('Unable to load league day.'));
      getPlayers()
        .then(setPlayers)
        .catch(() => setError('Unable to load players.'));
    };
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [id]);

  const availablePlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return players
      .filter((player) => !leagueDay?.selectedPlayers.some((entry) => entry.playerId === player.id))
      .filter((player) => !query || playerLabel(player).toLowerCase().includes(query))
      .sort((a, b) => playerLabel(a).localeCompare(playerLabel(b)));
  }, [players, leagueDay, search]);

  const hasSearch = search.trim().length > 0;
  const showAvailableList = !isMobile || hasSearch;

  const selectedPlayers = useMemo(() => leagueDay?.selectedPlayers ?? [], [leagueDay]);
  const canCreateRound = selectedPlayers.length >= 3;

  const addPlayer = async (playerId: string) => {
    if (!id || !leagueDay) return;
    const teamsAlreadyExist = leagueDay.teams.length > 0;

    if (teamsAlreadyExist) {
      const player = players.find((p) => p.id === playerId);
      const name = player ? playerLabel(player) : 'this golfer';
      const nextSelectionOrder = leagueDay.selectedPlayers.length + 1;
      const plan = planLateEntry(leagueDay.teams, { playerId, selectionOrder: nextSelectionOrder });
      const confirmMessage = plan.createdNewTeam
        ? `Teams have already been created. Add ${name} as a late entry on a new Team ${plan.targetTeamNumber}?`
        : `Teams have already been created. Add ${name} as a late entry to Team ${plan.targetTeamNumber}?`;
      if (!window.confirm(confirmMessage)) return;

      try {
        const updatedSelectedPlayers = await addLeagueDayPlayer(id, playerId);
        await updateLeagueDayTeams(id, plan.teams, currentPlayer?.isAdmin ?? false);
        setLeagueDay((current) =>
          current ? { ...current, selectedPlayers: updatedSelectedPlayers, teams: plan.teams } : current
        );
      } catch (error: any) {
        setError(error.response?.data?.message ?? 'Unable to add late entry.');
      }
      return;
    }

    try {
      const updated = await addLeagueDayPlayer(id, playerId);
      setLeagueDay((current) => (current ? { ...current, selectedPlayers: updated } : current));
    } catch (error: any) {
      setError(error.response?.data?.message ?? 'Unable to add player.');
    }
  };

  const removePlayer = async (playerId: string) => {
    if (!id) return;
    try {
      await removeLeagueDayPlayer(id, playerId);
      setLeagueDay((current) =>
        current
          ? {
              ...current,
              selectedPlayers: current.selectedPlayers
                .filter((entry) => entry.playerId !== playerId)
                .map((entry, idx) => ({ ...entry, selectionOrder: idx + 1 })),
            }
          : current
      );
    } catch (_error) {
      setError('Unable to remove player.');
    }
  };

  const changeAssignedTeam = async (playerId: string, value: string) => {
    if (!id || !leagueDay) return;
    const assignedTeam = value === '' ? undefined : (Number(value) as 1 | 2 | 3);
    const updatedSelectedPlayers = leagueDay.selectedPlayers.map((entry) =>
      entry.playerId === playerId ? { ...entry, assignedTeam } : entry
    );
    try {
      await updateLeagueDayPlayerOrder(id, updatedSelectedPlayers);
      setLeagueDay((current) => (current ? { ...current, selectedPlayers: updatedSelectedPlayers } : current));
    } catch (_error) {
      setError('Unable to update team assignment.');
    }
  };

  const handleCreateRound = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to create the round? This will generate teams for all selected golfers.')) {
      return;
    }
    try {
      await generateLeagueDayTeams(id);
      navigate(`/league-days/${id}/teams`);
    } catch (error: any) {
      setError(error.response?.data?.message ?? 'Unable to create round.');
    }
  };

  if (!leagueDay) {
    return (
      <div className="page-card">
        <p>Loading league day...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-card select-players-header">
        <div>
          <h2 className="section-title">Select Players</h2>
          <div className="league-day-meta">
            <span className="meta-chip">{leagueDay.date}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
          <button className="button" onClick={handleCreateRound} disabled={!canCreateRound}>
            Create Round
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {leagueDay.teams.length > 0 && (
        <p className="hint-note" style={{ marginBottom: '1rem' }}>
          Teams have already been created — adding a golfer now adds them as a late entry directly onto a team.
        </p>
      )}

      <div className="split-columns">
        <section className="panel">
          <div className="panel-header">
            <h3>Available Golfers</h3>
            <span className="count-badge">{availablePlayers.length}</span>
          </div>
          <div className="panel-search">
            <input
              type="search"
              placeholder="Search golfers..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="panel-body">
            {!showAvailableList ? (
              <p className="empty-state">Search for a golfer above to add them.</p>
            ) : availablePlayers.length === 0 ? (
              <p className="empty-state">
                {search ? 'No golfers match your search.' : 'All golfers have been added to the roster.'}
              </p>
            ) : (
              <ul className="roster-list">
                {availablePlayers.map((player) => (
                  <li key={player.id} className="roster-item">
                    <div className="player-name">{playerLabel(player)}</div>
                    <button className="button-icon" title="Add to roster" onClick={() => addPlayer(player.id)}>
                      +
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Playing Today</h3>
            <span className="count-badge count-badge-accent">{selectedPlayers.length}</span>
          </div>
          <div className="panel-body panel-body-no-search">
            {selectedPlayers.length === 0 ? (
              <p className="empty-state">No golfers selected yet. Add golfers from the list on the left.</p>
            ) : (
              <ul className="roster-list">
                {selectedPlayers.map((entry) => {
                  const player = players.find((p) => p.id === entry.playerId);
                  if (!player) return null;
                  return (
                    <li key={entry.playerId} className="roster-item">
                      <div className="roster-item-main">
                        <span className="roster-order">{entry.selectionOrder}</span>
                        <div>
                          <div className="player-name">
                            {playerLabel(player)}
                            {entry.assignedTeam && (
                              <span className="meta-chip meta-chip-accent assigned-team-chip">Team {entry.assignedTeam}</span>
                            )}
                          </div>
                          <div className="player-meta">
                            Front {player.frontTarget} / Back {player.backTarget}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <select
                          value={entry.assignedTeam ?? ''}
                          title="Which team this golfer should be placed on when teams are created"
                          onChange={(event) => changeAssignedTeam(entry.playerId, event.target.value)}
                        >
                          <option value="">Random</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                        </select>
                        <button
                          className="button-icon button-icon-danger"
                          title="Remove from roster"
                          onClick={() => removePlayer(player.id)}
                        >
                          &times;
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
