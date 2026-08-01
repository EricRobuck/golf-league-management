import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLeagueDays } from '../api';
import { LeagueDay } from '../types';

export default function PastRoundsPage() {
  const [leagueDays, setLeagueDays] = useState<LeagueDay[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLeagueDays()
      .then(setLeagueDays)
      .catch(() => setError('Unable to load rounds.'));
  }, []);

  const rounds = [...leagueDays]
    .filter((day) => day.teams.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="page-card">
      <h2 className="section-title">Past Rounds</h2>
      {error && <div className="alert">{error}</div>}
      {rounds.length === 0 ? (
        <p className="empty-state">No rounds with teams yet.</p>
      ) : (
        <ul className="roster-list">
          {rounds.map((round) => (
            <li key={round.id} className="roster-item">
              <span className="player-name">{round.date}</span>
              <Link className="button secondary" to={`/league-days/${round.id}/scores`}>
                View Teams
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
