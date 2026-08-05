import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getLeagueDay, patchPlayer, updateLeagueDayTeams } from '../api';
import { useCurrentPlayer } from '../context/CurrentPlayerContext';
import { LeagueDay, Player, Team } from '../types';
import { adjustTargets } from '../utils/targetAdjustment';

function playerLabel(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`;
}

export default function EnterScoresPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentPlayer, players } = useCurrentPlayer();
  const [leagueDay, setLeagueDay] = useState<LeagueDay | null>(null);
  const [scores, setScores] = useState<Record<string, { front: string; back: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getLeagueDay(id)
      .then((day) => setLeagueDay(day))
      .catch(() => setError('Unable to load league day.'));
  }, [id]);

  const myTeam = useMemo(() => {
    if (!leagueDay || !currentPlayer) return null;
    return leagueDay.teams.find((team) => team.players.some((entry) => entry.playerId === currentPlayer.id)) ?? null;
  }, [leagueDay, currentPlayer]);

  useEffect(() => {
    if (!myTeam) return;
    setScores((current) => {
      const next = { ...current };
      for (const entry of myTeam.players) {
        if (next[entry.playerId]) continue;
        next[entry.playerId] = {
          front: entry.frontScore !== undefined ? String(entry.frontScore) : '',
          back: entry.backScore !== undefined ? String(entry.backScore) : '',
        };
      }
      return next;
    });
  }, [myTeam]);

  const handleScoreChange = (playerId: string, field: 'front' | 'back', value: string) => {
    setScores((current) => ({
      ...current,
      [playerId]: { ...current[playerId], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!id || !leagueDay || !myTeam) return;

    const parsed: Record<string, { front?: number; back?: number }> = {};
    for (const entry of myTeam.players) {
      const value = scores[entry.playerId] ?? { front: '', back: '' };
      const front = value.front === '' ? undefined : Number(value.front);
      const back = value.back === '' ? undefined : Number(value.back);
      if (front !== undefined && (!Number.isInteger(front) || front < 0)) {
        setError('Scores must be non-negative whole numbers.');
        return;
      }
      if (back !== undefined && (!Number.isInteger(back) || back < 0)) {
        setError('Scores must be non-negative whole numbers.');
        return;
      }
      parsed[entry.playerId] = { front, back };
    }

    setSaving(true);
    setError(null);
    try {
      const updatedTeams: Team[] = leagueDay.teams.map((team) => {
        if (team.teamNumber !== myTeam.teamNumber) return team;
        return {
          ...team,
          players: team.players.map((entry) => ({
            ...entry,
            frontScore: parsed[entry.playerId]?.front,
            backScore: parsed[entry.playerId]?.back,
          })),
        };
      });
      await updateLeagueDayTeams(id, updatedTeams);

      const targetPatches: Promise<Player>[] = [];
      for (const entry of myTeam.players) {
        const player = players.find((p) => p.id === entry.playerId);
        const front = parsed[entry.playerId]?.front;
        const back = parsed[entry.playerId]?.back;
        if (!player || front === undefined || back === undefined) continue;
        const { frontTarget, backTarget } = adjustTargets(player, front, back);
        const patch: Partial<Player> = {};
        if (frontTarget !== player.frontTarget) patch.frontTarget = frontTarget;
        if (backTarget !== player.backTarget) patch.backTarget = backTarget;
        if (Object.keys(patch).length > 0) {
          targetPatches.push(patchPlayer(entry.playerId, patch));
        }
      }
      await Promise.all(targetPatches);

      navigate('/profile');
    } catch (_err) {
      setError('Unable to save scores.');
    } finally {
      setSaving(false);
    }
  };

  if (!leagueDay) {
    return (
      <div className="page-card">
        <p>Loading...</p>
      </div>
    );
  }

  if (!myTeam) {
    return (
      <div className="page-card">
        <h2 className="section-title">Enter Scores</h2>
        <p className="empty-state">You're not on a team for this round.</p>
      </div>
    );
  }

  return (
    <div className="page-card">
      <h2 className="section-title">Enter Scores — Team {myTeam.teamNumber}</h2>
      {error && <div className="alert">{error}</div>}

      <div className="form-grid">
        {myTeam.players.map((entry) => {
          const player = players.find((p) => p.id === entry.playerId);
          const label = player ? playerLabel(player.firstName, player.lastName) : entry.playerId;
          const value = scores[entry.playerId] ?? { front: '', back: '' };
          return (
            <div key={entry.playerId} className="panel" style={{ padding: '1.1rem 1.25rem' }}>
              <div className="player-name" style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>
                {label}
                {player?.id === currentPlayer?.id ? ' (You)' : ''}
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="form-field" style={{ flex: '1 1 140px' }}>
                  <label>Front Score</label>
                  <input
                    type="number"
                    min="0"
                    value={value.front}
                    onChange={(event) => handleScoreChange(entry.playerId, 'front', event.target.value)}
                  />
                </div>
                <div className="form-field" style={{ flex: '1 1 140px' }}>
                  <label>Back Score</label>
                  <input
                    type="number"
                    min="0"
                    value={value.back}
                    onChange={(event) => handleScoreChange(entry.playerId, 'back', event.target.value)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <button className="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
