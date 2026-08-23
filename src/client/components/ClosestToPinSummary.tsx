import { ClosestToPin } from '../types';

export default function ClosestToPinSummary({ closestToPin }: { closestToPin?: ClosestToPin }) {
  const hasAny = Boolean(
    closestToPin && (closestToPin.frontHole || closestToPin.backHole || closestToPin.frontWinningTeam || closestToPin.backWinningTeam)
  );
  if (!hasAny) return null;

  return (
    <div className="page-card" style={{ marginBottom: '1.1rem' }}>
      <h3 style={{ marginTop: 0, marginBottom: '0.6rem' }}>Closest to the Pin</h3>
      <div className="league-day-meta">
        <span className="meta-chip meta-chip-accent">
          Front{closestToPin?.frontHole ? ` — Hole ${closestToPin.frontHole}` : ''}
          {closestToPin?.frontWinningTeam ? ` — Team ${closestToPin.frontWinningTeam} won` : ' — winner not entered yet'}
        </span>
        <span className="meta-chip meta-chip-accent">
          Back{closestToPin?.backHole ? ` — Hole ${closestToPin.backHole}` : ''}
          {closestToPin?.backWinningTeam ? ` — Team ${closestToPin.backWinningTeam} won` : ' — winner not entered yet'}
        </span>
      </div>
    </div>
  );
}
