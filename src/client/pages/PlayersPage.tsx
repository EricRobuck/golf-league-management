import { useEffect, useState } from 'react';
import { getPlayers, patchPlayer } from '../api';
import { Player } from '../types';
import { Link } from 'react-router-dom';
import { useCurrentPlayer } from '../context/CurrentPlayerContext';

export default function PlayersPage() {
  const { currentPlayer } = useCurrentPlayer();
  const isAdmin = currentPlayer?.isAdmin ?? false;
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="page-card">
      <h2 className="section-title">Players</h2>
      {error && <div className="alert">{error}</div>}
      <div className="table-scroll">
        <table className="table" style={{ fontSize: '1.15rem' }}>
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Front Target</th>
              <th>Back Target</th>
              <th>Notes</th>
              <th>Admin</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id}>
                <td>{player.firstName}</td>
                <td>{player.lastName}</td>
                <td>{player.frontTarget}</td>
                <td>{player.backTarget}</td>
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
