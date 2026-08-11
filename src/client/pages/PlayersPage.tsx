import { useEffect, useMemo, useState } from 'react';
import { getLeagueDays, getPlayers, patchPlayer, updateLeagueDayTeams } from '../api';
import { LeagueDay, Player, Team } from '../types';
import { Link } from 'react-router-dom';
import { useCurrentPlayer } from '../context/CurrentPlayerContext';
import { todayDateString } from '../constants';
import { adjustTargets } from '../utils/targetAdjustment';

type SortKey = 'firstName' | 'lastName' | 'frontTarget' | 'backTarget' | 'total' | 'notes' | 'isAdmin';
type SortDirection = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'frontTarget', label: 'Front Target' },
  { key: 'backTarget', label: 'Back Target' },
  { key: 'total', label: 'Total' },
  { key: 'notes', label: 'Notes' },
  { key: 'isAdmin', label: 'Admin' },
];

function sortValue(player: Player, key: SortKey): string | number {
  switch (key) {
    case 'total':
      return player.frontTarget + player.backTarget;
    case 'notes':
      return (player.notes ?? '').toLowerCase();
    case 'isAdmin':
      return player.isAdmin ? 1 : 0;
    case 'firstName':
    case 'lastName':
      return player[key].toLowerCase();
    default:
      return player[key];
  }
}

export default function PlayersPage() {
  const { currentPlayer } = useCurrentPlayer();
  const isAdmin = currentPlayer?.isAdmin ?? false;
  const [players, setPlayers] = useState<Player[]>([]);
  const [leagueDay, setLeagueDay] = useState<LeagueDay | null>(null);
  const [scores, setScores] = useState<Record<string, { front: string; back: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('lastName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const today = todayDateString();

  useEffect(() => {
    getPlayers()
      .then(setPlayers)
      .catch(() => setError('Unable to load players.'));
    getLeagueDays()
      .then((days) => setLeagueDay(days.find((day) => day.date === today) ?? null))
      .catch(() => setError('Unable to load today\'s round.'));
  }, [today]);

  const teams = useMemo(() => leagueDay?.teams ?? [], [leagueDay]);
  const showScoreEntry = isAdmin && teams.length > 0;

  useEffect(() => {
    setScores((current) => {
      const next = { ...current };
      for (const team of teams) {
        for (const entry of team.players) {
          if (next[entry.playerId]) continue;
          next[entry.playerId] = {
            front: entry.frontScore !== undefined ? String(entry.frontScore) : '',
            back: entry.backScore !== undefined ? String(entry.backScore) : '',
          };
        }
      }
      return next;
    });
  }, [teams]);

  const handleToggleAdmin = async (player: Player) => {
    const makeAdmin = !player.isAdmin;
    if (!window.confirm(`${makeAdmin ? 'Make' : 'Remove'} ${player.firstName} ${player.lastName} ${makeAdmin ? 'an admin' : 'as an admin'}?`)) {
      return;
    }
    try {
      const updated = await patchPlayer(player.id, { isAdmin: makeAdmin });
      setPlayers((current) => current.map((p) => (p.id === player.id ? updated : p)));
    } catch (_error) {
      setError('Unable to update admin status.');
    }
  };

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleScoreChange = (playerId: string, field: 'front' | 'back', value: string) => {
    setScores((current) => ({
      ...current,
      [playerId]: { ...(current[playerId] ?? { front: '', back: '' }), [field]: value },
    }));
    setSaved(false);
  };

  const handleSaveScores = async () => {
    if (!leagueDay) return;

    const parsed: Record<string, { front?: number; back?: number }> = {};
    for (const team of teams) {
      for (const entry of team.players) {
        const value = scores[entry.playerId] ?? { front: '', back: '' };
        const front = value.front === '' ? undefined : Number(value.front);
        const back = value.back === '' ? undefined : Number(value.back);
        if (front !== undefined && (!Number.isInteger(front) || front < 0)) {
          setError('Scores must be non-negative whole numbers.');
          return;
        }
        if (back !== undefined && (!Number.isInteger(back) || back < 0)) {
          setError('Scores must be non-negative whole numbers.');
          return;
        }
        parsed[entry.playerId] = { front, back };
      }
    }

    setSaving(true);
    setError(null);
    try {
      const updatedTeams: Team[] = teams.map((team) => ({
        ...team,
        players: team.players.map((entry) => ({
          ...entry,
          frontScore: parsed[entry.playerId]?.front,
          backScore: parsed[entry.playerId]?.back,
        })),
      }));
      await updateLeagueDayTeams(leagueDay.id, updatedTeams);

      const targetPatches: Promise<Player>[] = [];
      for (const team of updatedTeams) {
        for (const entry of team.players) {
          const player = players.find((p) => p.id === entry.playerId);
          if (!player || entry.frontScore === undefined || entry.backScore === undefined) continue;
          const { frontTarget, backTarget } = adjustTargets(player, entry.frontScore, entry.backScore);
          const patch: Partial<Player> = {};
          if (frontTarget !== player.frontTarget) patch.frontTarget = frontTarget;
          if (backTarget !== player.backTarget) patch.backTarget = backTarget;
          if (Object.keys(patch).length > 0) {
            targetPatches.push(patchPlayer(entry.playerId, patch));
          }
        }
      }
      const updatedPlayers = await Promise.all(targetPatches);

      setLeagueDay((current) => (current ? { ...current, teams: updatedTeams } : current));
      if (updatedPlayers.length > 0) {
        setPlayers((current) => current.map((p) => updatedPlayers.find((updated) => updated.id === p.id) ?? p));
      }
      setSaved(true);
    } catch (_error) {
      setError('Unable to save scores.');
    } finally {
      setSaving(false);
    }
  };

  const sortedPlayers = useMemo(() => {
    const factor = sortDirection === 'asc' ? 1 : -1;
    return [...players].sort((a, b) => {
      const valueA = sortValue(a, sortKey);
      const valueB = sortValue(b, sortKey);
      if (valueA < valueB) return -1 * factor;
      if (valueA > valueB) return 1 * factor;
      return 0;
    });
  }, [players, sortKey, sortDirection]);

  return (
    <div className="page-card">
      <h2 className="section-title">Players</h2>
      {error && <div className="alert">{error}</div>}
      <div className="table-scroll">
        <table className="table" style={{ fontSize: '1.15rem' }}>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column.key} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(column.key)}>
                  {column.label}
                  {sortKey === column.key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
              {showScoreEntry && <th>Front Score</th>}
              {showScoreEntry && <th>Back Score</th>}
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => {
              const isInTodaysRound = teams.some((team) => team.players.some((entry) => entry.playerId === player.id));
              const value = scores[player.id] ?? { front: '', back: '' };
              return (
                <tr key={player.id}>
                  <td>{player.firstName}</td>
                  <td>{player.lastName}</td>
                  <td>{player.frontTarget}</td>
                  <td>{player.backTarget}</td>
                  <td>{player.frontTarget + player.backTarget}</td>
                  <td>{player.notes ?? ''}</td>
                  <td>
                    {isAdmin ? (
                      <input
                        type="checkbox"
                        checked={player.isAdmin}
                        onChange={() => handleToggleAdmin(player)}
                        title={player.isAdmin ? 'Remove admin' : 'Make admin'}
                      />
                    ) : player.isAdmin ? (
                      'Admin'
                    ) : (
                      ''
                    )}
                  </td>
                  {showScoreEntry && (
                    <td>
                      {isInTodaysRound ? (
                        <input
                          type="number"
                          min="0"
                          style={{ width: '4.5rem' }}
                          value={value.front}
                          onChange={(event) => handleScoreChange(player.id, 'front', event.target.value)}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                  {showScoreEntry && (
                    <td>
                      {isInTodaysRound ? (
                        <input
                          type="number"
                          min="0"
                          style={{ width: '4.5rem' }}
                          value={value.back}
                          onChange={(event) => handleScoreChange(player.id, 'back', event.target.value)}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                  {isAdmin && (
                    <td>
                      <Link
                        className="button-icon secondary"
                        title="Edit"
                        to={`/players/edit/${player.id}`}
                        style={{ width: '2.1rem', height: '2.1rem', fontSize: '0.95rem' }}
                      >
                        ✎
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showScoreEntry && (
        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="button" onClick={handleSaveScores} disabled={saving}>
            {saving ? 'Saving...' : 'Save Scores'}
          </button>
          {saved && <span className="unsaved-note" style={{ color: '#15803d' }}>Saved!</span>}
        </div>
      )}
    </div>
  );
}
