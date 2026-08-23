import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPlayer, updatePlayer } from '../api';
import { MEMBER_STATUSES } from '../constants';
import { Player } from '../types';

export default function EditPlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getPlayer(id)
      .then(setPlayer)
      .catch(() => setError('Unable to load player.'));
  }, [id]);

  const handleChange = (key: keyof Omit<Player, 'id' | 'createdAt' | 'updatedAt'>, value: string | number | boolean) => {
    if (!player) return;
    setPlayer({ ...player, [key]: value } as Player);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!player) return;
    try {
      await updatePlayer(player.id, {
        firstName: player.firstName,
        lastName: player.lastName,
        frontTarget: player.frontTarget,
        backTarget: player.backTarget,
        notes: player.notes,
        status: player.status,
      });
      navigate('/players');
    } catch (error: any) {
      setError(error.response?.data?.message ?? 'Unable to save golfer.');
    }
  };

  if (error) {
    return (
      <div className="page-card">
        <div className="alert">{error}</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="page-card">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-card">
      <h2 className="section-title">Edit Golfer</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-field">
          <label>First Name</label>
          <input value={player.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Last Name</label>
          <input value={player.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Front Target</label>
          <input type="number" value={player.frontTarget} onChange={(e) => handleChange('frontTarget', Number(e.target.value))} min="0" />
        </div>
        <div className="form-field">
          <label>Back Target</label>
          <input type="number" value={player.backTarget} onChange={(e) => handleChange('backTarget', Number(e.target.value))} min="0" />
        </div>
        <div className="form-field">
          <label>Notes</label>
          <textarea value={player.notes ?? ''} onChange={(e) => handleChange('notes', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Status</label>
          <select value={player.status ?? ''} onChange={(e) => handleChange('status', e.target.value)}>
            <option value="">—</option>
            {MEMBER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <button type="submit" className="button">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
