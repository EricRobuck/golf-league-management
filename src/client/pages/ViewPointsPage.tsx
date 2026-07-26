import { useEffect, useState } from 'react';
import { getPlayers } from '../api';
import { Player } from '../types';

export default function ViewPointsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlayers()
      .then(setPlayers)
      .catch(() => setError('Unable to load players.'));
  }, []);

  const sortedPlayers = [...players].sort((a, b) =>
    a.lastName === b.lastName ? a.firstName.localeCompare(b.firstName) : a.lastName.localeCompare(b.lastName)
  );

  return (
    <div className="page-card">
      <h2 className="section-title">Points</h2>
      {error && <div className="alert">{error}</div>}
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Front</th>
              <th>Back</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => (
              <tr key={player.id}>
                <td>{player.firstName}</td>
                <td>{player.lastName}</td>
                <td>{player.frontTarget}</td>
                <td>{player.backTarget}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
