import { useEffect, useMemo, useState } from 'react';
import { createPlayerConflict, deletePlayerConflict, getPlayerConflicts, getPlayers } from '../api';
import { Player, PlayerConflict } from '../types';
import { compareByLastName, playerLabel } from '../utils/playerName';

export default function PlayerConflictsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [conflicts, setConflicts] = useState<PlayerConflict[]>([]);
  const [playerAId, setPlayerAId] = useState('');
  const [playerBId, setPlayerBId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([getPlayers(), getPlayerConflicts()])
      .then(([playersResult, conflictsResult]) => {
        setPlayers(playersResult);
        setConflicts(conflictsResult);
      })
      .catch(() => setError('Unable to load the conflict list.'));
  };

  useEffect(() => {
    load();
  }, []);

  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const sortedPlayers = useMemo(() => [...players].sort(compareByLastName), [players]);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!playerAId || !playerBId) {
      setError('Choose two golfers.');
      return;
    }
    if (playerAId === playerBId) {
      setError('Choose two different golfers.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createPlayerConflict(playerAId, playerBId);
      setConflicts((current) => [...current, created]);
      setPlayerAId('');
      setPlayerBId('');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to add the conflict.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (conflict: PlayerConflict) => {
    const playerA = byId.get(conflict.playerAId);
    const playerB = byId.get(conflict.playerBId);
    const label = `${playerA ? playerLabel(playerA) : conflict.playerAId} & ${playerB ? playerLabel(playerB) : conflict.playerBId}`;
    if (!window.confirm(`Remove the restriction between ${label}?`)) return;
    try {
      await deletePlayerConflict(conflict.id);
      setConflicts((current) => current.filter((c) => c.id !== conflict.id));
    } catch (_error) {
      setError('Unable to remove the restriction.');
    }
  };

  return (
    <div className="page-card">
      <h2 className="section-title">Cannot Play Together</h2>
      <p className="hint-note" style={{ marginBottom: '1.1rem' }}>
        Golfers on this list will never be placed on the same team when teams are generated.
      </p>
      {error && <div className="alert">{error}</div>}

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
        <div className="form-field" style={{ minWidth: '14rem' }}>
          <label>Golfer</label>
          <select value={playerAId} onChange={(event) => setPlayerAId(event.target.value)}>
            <option value="">Select a golfer...</option>
            {sortedPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {playerLabel(player)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field" style={{ minWidth: '14rem' }}>
          <label>Cannot play with</label>
          <select value={playerBId} onChange={(event) => setPlayerBId(event.target.value)}>
            <option value="">Select a golfer...</option>
            {sortedPlayers
              .filter((player) => player.id !== playerAId)
              .map((player) => (
                <option key={player.id} value={player.id}>
                  {playerLabel(player)}
                </option>
              ))}
          </select>
        </div>
        <button type="submit" className="button" disabled={saving}>
          {saving ? 'Adding...' : 'Add'}
        </button>
      </form>

      {conflicts.length === 0 ? (
        <p className="empty-state">No restrictions yet.</p>
      ) : (
        <ul className="roster-list">
          {conflicts.map((conflict) => {
            const playerA = byId.get(conflict.playerAId);
            const playerB = byId.get(conflict.playerBId);
            return (
              <li key={conflict.id} className="roster-item">
                <div className="player-name">
                  {playerA ? playerLabel(playerA) : conflict.playerAId} ⇄ {playerB ? playerLabel(playerB) : conflict.playerBId}
                </div>
                <button
                  className="button-icon button-icon-danger"
                  title="Remove restriction"
                  onClick={() => handleRemove(conflict)}
                >
                  &times;
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
