import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPlayer } from '../api';
import { MEMBER_STATUSES } from '../constants';
import { MemberStatus } from '../types';

export default function AddPlayerPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    frontTarget: 0,
    backTarget: 0,
    notes: '',
    status: '' as MemberStatus | '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: string, value: string | number) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.firstName || !form.lastName) {
      setError('First name and last name are required.');
      return;
    }
    try {
      await createPlayer({
        firstName: form.firstName,
        lastName: form.lastName,
        frontTarget: form.frontTarget,
        backTarget: form.backTarget,
        notes: form.notes || undefined,
        isAdmin: false,
        status: form.status || undefined,
      });
      navigate('/players');
    } catch (error: any) {
      setError(error.response?.data?.message ?? 'Unable to save golfer.');
    }
  };

  return (
    <div className="page-card">
      <h2 className="section-title">Add Golfer</h2>
      {error && <div className="alert">{error}</div>}
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-field">
          <label>First Name</label>
          <input value={form.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Last Name</label>
          <input value={form.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Front Target</label>
          <input type="number" value={form.frontTarget} onChange={(e) => handleChange('frontTarget', Number(e.target.value))} min="0" />
        </div>
        <div className="form-field">
          <label>Back Target</label>
          <input type="number" value={form.backTarget} onChange={(e) => handleChange('backTarget', Number(e.target.value))} min="0" />
        </div>
        <div className="form-field">
          <label>Notes</label>
          <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Status</label>
          <select value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
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
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
