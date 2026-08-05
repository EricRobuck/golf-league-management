import { useEffect, useMemo, useState } from 'react';
import { getPlayers, patchPlayer } from '../api';
import { Player } from '../types';
import { Link } from 'react-router-dom';
import { useCurrentPlayer } from '../context/CurrentPlayerContext';

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
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('lastName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    getPlayers()
      .then(setPlayers)
      .catch(() => setError('Unable to load players.'));
  }, []);

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
    </div>
  );
}
