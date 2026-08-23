import { useEffect, useState } from 'react';
import { getDailyMessage, setDailyMessage } from '../api';

export default function DailyMessageEditor({ date }: { date: string }) {
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDailyMessage(date)
      .then((result) => {
        setMessage(result.message);
        setDraft(result.message);
      })
      .catch(() => setError('Unable to load the message of the day.'));
  }, [date]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await setDailyMessage(date, draft);
      setMessage(updated.message);
      setSaved(true);
    } catch (_err) {
      setError('Unable to save the message.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="form-field" style={{ marginBottom: '1rem' }}>
      <label>Message of the Day ({date})</label>
      {error && <div className="alert">{error}</div>}
      <textarea
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setSaved(false);
        }}
        placeholder="Leave a note for everyone today..."
        rows={3}
      />
      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button className="button secondary" onClick={handleSave} disabled={saving || draft === message}>
          {saving ? 'Saving...' : 'Save Message'}
        </button>
        {saved && <span className="unsaved-note" style={{ color: '#15803d' }}>Saved!</span>}
      </div>
    </div>
  );
}
