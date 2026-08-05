import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ensureTodayLeagueDay, getLeagueDays } from '../api';
import { todayDateString } from '../constants';

export default function TodayScorePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const today = todayDateString();

  useEffect(() => {
    getLeagueDays()
      .then((leagueDays) => {
        const todayLeagueDay = leagueDays.find((day) => day.date === today);
        if (todayLeagueDay) {
          navigate(`/league-days/${todayLeagueDay.id}/teams`, { replace: true });
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setError('Unable to load league days.'));
  }, [navigate, today]);

  const handleStartToday = async () => {
    try {
      const leagueDay = await ensureTodayLeagueDay();
      navigate(`/league-days/${leagueDay.id}/select`);
    } catch (_error) {
      setError('Unable to start today\'s round.');
    }
  };

  if (error) {
    return (
      <div className="page-card">
        <div className="alert">{error}</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page-card">
        <h2 className="section-title">Enter Score</h2>
        <p className="empty-state">No round has been started for today ({today}).</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={handleStartToday}>
            Start Today's Round
          </button>
          <Link className="button secondary" to="/past-rounds">
            Past Rounds
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-card">
      <p>Loading today's league day...</p>
    </div>
  );
}
