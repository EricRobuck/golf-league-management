import { useEffect, useMemo, useState } from 'react';
import { getLeagueDays, getPlayers } from '../api';
import { MEMBER_STATUSES } from '../constants';
import { LeagueDay, MemberStatus, Player } from '../types';
import { playerLabel } from '../utils/playerName';

const UNASSIGNED_LABEL = 'No Status';
const CATEGORY_LABELS: (MemberStatus | typeof UNASSIGNED_LABEL)[] = [...MEMBER_STATUSES, UNASSIGNED_LABEL];

export default function RoundStatusReportPage() {
  const [leagueDays, setLeagueDays] = useState<LeagueDay[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getLeagueDays(), getPlayers()])
      .then(([leagueDaysResult, playersResult]) => {
        setLeagueDays(leagueDaysResult);
        setPlayers(playersResult);
      })
      .catch(() => setError('Unable to load the status report.'));
  }, []);

  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  const rounds = useMemo(() => {
    return [...leagueDays]
      .filter((day) => day.teams.length > 0)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((day) => {
        const playerIds = new Set(day.teams.flatMap((team) => team.players.map((entry) => entry.playerId)));
        const categories = new Map<MemberStatus | typeof UNASSIGNED_LABEL, Player[]>();
        for (const label of CATEGORY_LABELS) categories.set(label, []);
        for (const playerId of playerIds) {
          const player = byId.get(playerId);
          const label = player?.status ?? UNASSIGNED_LABEL;
          categories.get(label)!.push(player ?? { id: playerId, firstName: playerId, lastName: '', frontTarget: 0, backTarget: 0, isAdmin: false, createdAt: '', updatedAt: '' });
        }
        return { day, categories, total: playerIds.size };
      });
  }, [leagueDays, byId]);

  return (
    <div className="page-card">
      <h2 className="section-title">Round Status Report</h2>
      {error && <div className="alert">{error}</div>}
      {rounds.length === 0 ? (
        <p className="empty-state">No rounds with teams yet.</p>
      ) : (
        <div className="team-grid">
          {rounds.map(({ day, categories, total }) => (
            <div key={day.id} className="team-card">
              <h3>{day.date}</h3>
              <div className="league-day-meta" style={{ marginBottom: '0.75rem' }}>
                <span className="meta-chip meta-chip-accent">{total} played</span>
                {CATEGORY_LABELS.map((label) => (
                  <span key={label} className="meta-chip">
                    {label} {categories.get(label)!.length}
                  </span>
                ))}
              </div>
              {CATEGORY_LABELS.map((label) => {
                const rows = categories.get(label)!;
                if (rows.length === 0) return null;
                return (
                  <div key={label} style={{ marginBottom: '0.75rem' }}>
                    <strong>
                      {label} ({rows.length})
                    </strong>
                    <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                      {rows
                        .slice()
                        .sort((a, b) => playerLabel(a).localeCompare(playerLabel(b)))
                        .map((player) => (
                          <li key={player.id}>{playerLabel(player)}</li>
                        ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
