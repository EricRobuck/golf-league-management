import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ensureTodayLeagueDay, getLeagueDays } from '../api';
import { LeagueDay } from '../types';

export default function LeagueDaysPage() {
  const navigate = useNavigate();
  const [leagueDays, setLeagueDays] = useState<LeagueDay[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLeagueDays()
      .then(setLeagueDays)
      .catch(() => setError('Unable to load league days.'));
  }, []);

  const handleStartToday = async () => {
    try {
      const leagueDay = await ensureTodayLeagueDay();
      navigate(`/league-days/${leagueDay.id}/select`);
    } catch (_error) {
      setError('Unable to start today\'s round.');
    }
  };

  return (
    <div className="page-card">
      <h2 className="section-title">League Days</h2>
      {error && <div className="alert">{error}</div>}
      <div style={{ marginBottom: '1rem' }}>
        <button className="button" onClick={handleStartToday}>
          Start Today's Round
        </button>
      </div>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Players</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leagueDays.map((day) => (
              <tr key={day.id}>
                <td>{day.date}</td>
                <td>{day.status}</td>
                <td>{day.selectedPlayers.length}</td>
                <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link className="button secondary" to={`/league-days/${day.id}/select`}>
                    Select Players
                  </Link>
                  <Link className="button secondary" to={`/league-days/${day.id}/teams`}>
                    Teams
                  </Link>
                  <Link className="button secondary" to={`/league-days/${day.id}/scores`}>
                    View Scores
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
