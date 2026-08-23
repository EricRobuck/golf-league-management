import { useState } from 'react';
import { updateClosestToPin } from '../api';
import { CTP_BACK_HOLES, CTP_FRONT_HOLES } from '../constants';
import { LeagueDay } from '../types';

type Field = 'frontHole' | 'backHole' | 'frontWinningTeam' | 'backWinningTeam';

export default function ClosestToPinEditor({
  leagueDay,
  onUpdate,
}: {
  leagueDay: LeagueDay;
  onUpdate: (updated: LeagueDay) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<Field | null>(null);
  const closestToPin = leagueDay.closestToPin ?? {};
  const teams = leagueDay.teams;

  const handleChange = async (field: Field, value: string) => {
    const numeric = value === '' ? null : Number(value);
    setSavingField(field);
    setError(null);
    try {
      const updated = await updateClosestToPin(leagueDay.id, { [field]: numeric });
      onUpdate({ ...leagueDay, closestToPin: updated });
    } catch (_err) {
      setError('Unable to save closest-to-pin settings.');
    } finally {
      setSavingField(null);
    }
  };

  return (
    <div className="form-field closest-to-pin-editor">
      <label>Closest to the Pin</label>
      {error && <div className="alert">{error}</div>}
      <div className="closest-to-pin-editor-row">
        <select
          value={closestToPin.frontHole ?? ''}
          onChange={(event) => handleChange('frontHole', event.target.value)}
          disabled={savingField === 'frontHole'}
        >
          <option value="">Front Hole —</option>
          {CTP_FRONT_HOLES.map((hole) => (
            <option key={hole} value={hole}>
              Front Hole {hole}
            </option>
          ))}
        </select>
        <select
          value={closestToPin.backHole ?? ''}
          onChange={(event) => handleChange('backHole', event.target.value)}
          disabled={savingField === 'backHole'}
        >
          <option value="">Back Hole —</option>
          {CTP_BACK_HOLES.map((hole) => (
            <option key={hole} value={hole}>
              Back Hole {hole}
            </option>
          ))}
        </select>
        <select
          value={closestToPin.frontWinningTeam ?? ''}
          onChange={(event) => handleChange('frontWinningTeam', event.target.value)}
          disabled={savingField === 'frontWinningTeam' || teams.length === 0}
        >
          <option value="">Front Winner —</option>
          {teams.map((team) => (
            <option key={team.teamNumber} value={team.teamNumber}>
              Front Winner: Team {team.teamNumber}
            </option>
          ))}
        </select>
        <select
          value={closestToPin.backWinningTeam ?? ''}
          onChange={(event) => handleChange('backWinningTeam', event.target.value)}
          disabled={savingField === 'backWinningTeam' || teams.length === 0}
        >
          <option value="">Back Winner —</option>
          {teams.map((team) => (
            <option key={team.teamNumber} value={team.teamNumber}>
              Back Winner: Team {team.teamNumber}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
