import { FormEvent, ReactNode, useState } from 'react';
import { useAdminUnlock } from '../context/AdminUnlockContext';

export default function AdminPasswordGate({ children }: { children?: ReactNode }) {
  const { isUnlocked, unlock } = useAdminUnlock();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (isUnlocked) {
    return <>{children}</>;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (unlock(password)) {
      setPassword('');
      setError(null);
    } else {
      setError('Incorrect password.');
    }
  };

  return (
    <div className="page-card">
      <h2 className="section-title">Admin Password Required</h2>
      <p>Enter the admin password to continue.</p>
      {error && <div className="alert">{error}</div>}
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </div>
        <div>
          <button type="submit" className="button">
            Unlock
          </button>
        </div>
      </form>
    </div>
  );
}
