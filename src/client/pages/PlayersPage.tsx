import { useEffect, useState } from 'react';
import { deletePlayer, getPlayers } from '../api';
import { Player } from '../types';
import { Link } from 'react-router-dom';

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlayers()
      .then(setPlayers)
      .catch(() => setError('Unable to load players.'));
  }, []);

  const handleDelete = async (player: Player) => {
    if (!window.confirm(`Delete ${player.firstName} ${player.lastName}? This cannot be undone.`)) {
      return;
    }
    try {
      await deletePlayer(player.id);
      setPlayers((current) => current.filter((p) => p.id !== player.id));
    } catch (_error) {
      setError('Unable to delete golfer.');
    }
  };

  return (
    <div className="page-card">
      <h2 className="section-title">Players</h2>
      {error && <div className="alert">{error}</div>}
      <div style={{ marginBottom: '1rem' }}>
        <Link className="button" to="/players/add">
          Add Golfer
        </Link>
      </div>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Front Target</th>
              <th>Back Target</th>
              <th>Notes</th>
              <th>Actions</th>
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
                <td style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link className="button secondary" to={`/players/edit/${player.id}`}>
                    Edit
                  </Link>
                  <button className="button secondary" style={{ background: '#dc2626' }} onClick={() => handleDelete(player)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
