import { useEffect, useState } from 'react';
import { getPlayers } from '../api';
import { Player } from '../types';

function totalScore(player: Player) {
  return player.frontTarget + player.backTarget;
}

export default function RankPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlayers()
      .then(setPlayers)
      .catch(() => setError('Unable to load players.'));
  }, []);

  const rankedPlayers = [...players].sort((a, b) => totalScore(b) - totalScore(a));

  return (
    <div className="page-card">
      <h2 className="section-title">Rank</h2>
      {error && <div className="alert">{error}</div>}
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Front</th>
              <th>Back</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rankedPlayers.map((player, index) => (
              <tr key={player.id}>
                <td>{index + 1}</td>
                <td>{player.firstName}</td>
                <td>{player.lastName}</td>
                <td>{player.frontTarget}</td>
                <td>{player.backTarget}</td>
                <td>{totalScore(player)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
