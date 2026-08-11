import { useEffect, useMemo, useState } from 'react';
import { getPlayers, patchPlayer } from '../api';
import { Player } from '../types';
import { Link } from 'react-router-dom';
import { useCurrentPlayer } from '../context/CurrentPlayerContext';
import { playerLabel } from '../utils/playerName';

type SortKey = 'name' | 'frontTarget' | 'backTarget' | 'total' | 'notes' | 'isAdmin';
type SortDirection = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
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
    case 'name':
      return playerLabel(player).toLowerCase();
    default:
      return player[key];
  }
}

export default function PlayersPage() {
  const { currentPlayer } = useCurrentPlayer();
  const isAdmin = currentPlayer?.isAdmin ?? false;
  const [players, setPlayers] = useState<Player[]>([]);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    getPlayers()
      .then(setPlayers)
      .catch(() => setError('Unable to load players.'));
  }, []);

  const handleToggleAdmin = async (player: Player) => {
    const makeAdmin = !player.isAdmin;
    if (!window.confirm(`${makeAdmin ? 'Make' : 'Remove'} ${playerLabel(player)} ${makeAdmin ? 'an admin' : 'as an admin'}?`)) {
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

  const handleTargetChange = (playerId: string, field: 'frontTarget' | 'backTarget', value: string) => {
    const numeric = value === '' ? 0 : Number(value);
    if (!Number.isInteger(numeric) || numeric < 0) return;
    setPlayers((current) => current.map((p) => (p.id === playerId ? { ...p, [field]: numeric } : p)));
    setDirtyIds((current) => new Set(current).add(playerId));
    setSaved(false);
  };

  const handleSave = async () => {
    if (dirtyIds.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await Promise.all(
        Array.from(dirtyIds).map((playerId) => {
          const player = players.find((p) => p.id === playerId)!;
          return patchPlayer(playerId, { frontTarget: player.frontTarget, backTarget: player.backTarget });
        })
      );
      setPlayers((current) => current.map((p) => updated.find((u) => u.id === p.id) ?? p));
      setDirtyIds(new Set());
      setSaved(true);
    } catch (_error) {
      setError('Unable to save changes.');
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
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => (
              <tr key={player.id}>
                <td>{playerLabel(player)}</td>
                <td>
                  {isAdmin ? (
                    <input
                      type="number"
                      min="0"
                      style={{ width: '4.5rem' }}
                      value={player.frontTarget}
                      onChange={(event) => handleTargetChange(player.id, 'frontTarget', event.target.value)}
                    />
                  ) : (
                    player.frontTarget
                  )}
                </td>
                <td>
                  {isAdmin ? (
                    <input
                      type="number"
                      min="0"
                      style={{ width: '4.5rem' }}
                      value={player.backTarget}
                      onChange={(event) => handleTargetChange(player.id, 'backTarget', event.target.value)}
                    />
                  ) : (
                    player.backTarget
                  )}
                </td>
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
            ))}
          </tbody>
        </table>
      </div>
      {isAdmin && (
        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="button" onClick={handleSave} disabled={saving || dirtyIds.size === 0}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saved && <span className="unsaved-note" style={{ color: '#15803d' }}>Saved!</span>}
        </div>
      )}
    </div>
  );
}
