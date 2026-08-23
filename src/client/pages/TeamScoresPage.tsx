import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getLeagueDay, getPlayers } from '../api';
import { LeagueDay, Player } from '../types';
import LeagueDayResults from '../components/LeagueDayResults';

export default function TeamScoresPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leagueDay, setLeagueDay] = useState<LeagueDay | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getLeagueDay(id)
      .then(setLeagueDay)
      .catch(() => setError('Unable to load league day.'));
    getPlayers()
      .then(setPlayers)
      .catch(() => setError('Unable to load players.'));
  }, [id]);

  if (!leagueDay) {
    return (
      <div className="page-card">
        <p>Loading league day...</p>
      </div>
    );
  }

  return (
    <div className="page-card">
      <h2 className="section-title">Team Scores</h2>
      <div className="league-day-meta" style={{ marginBottom: '1rem' }}>
        <span className="meta-chip">{leagueDay.date}</span>
      </div>
      {error && <div className="alert">{error}</div>}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="button secondary" onClick={() => navigate(`/league-days/${id}/teams`)}>
          Enter More Scores
        </button>
      </div>

      <LeagueDayResults teams={leagueDay.teams} players={players} closestToPin={leagueDay.closestToPin} />

      <div style={{ marginTop: '1rem' }}>
        <Link className="button secondary" to="/league-days">
          Back to League Days
        </Link>
      </div>
    </div>
  );
}
