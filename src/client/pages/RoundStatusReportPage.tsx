import { useEffect, useMemo, useState } from 'react';
import { getLeagueDays, getPlayers } from '../api';
import { MEMBER_STATUSES, todayDateString } from '../constants';
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
  const today = todayDateString();
  const todaysDay = useMemo(() => leagueDays.find((day) => day.date === today), [leagueDays, today]);

  const report = useMemo(() => {
    if (!todaysDay || todaysDay.teams.length === 0) return null;
    const playerIds = new Set(todaysDay.teams.flatMap((team) => team.players.map((entry) => entry.playerId)));
    const categories = new Map<MemberStatus | typeof UNASSIGNED_LABEL, Player[]>();
    for (const label of CATEGORY_LABELS) categories.set(label, []);
    for (const playerId of playerIds) {
      const player = byId.get(playerId);
      const label = player?.status ?? UNASSIGNED_LABEL;
      categories
        .get(label)!
        .push(player ?? { id: playerId, firstName: playerId, lastName: '', frontTarget: 0, backTarget: 0, isAdmin: false, createdAt: '', updatedAt: '' });
    }
    return { categories, total: playerIds.size };
  }, [todaysDay, byId]);

  return (
    <div className="page-card">
      <h2 className="section-title">Status Report — {today}</h2>
      {error && <div className="alert">{error}</div>}
      {!error && !report ? (
        <p className="empty-state">
          {todaysDay ? "Teams haven't been generated for today's round yet." : 'No round has been created for today yet.'}
        </p>
      ) : report ? (
        <div className="team-card">
          <div className="league-day-meta" style={{ marginBottom: '0.75rem' }}>
            <span className="meta-chip meta-chip-accent">{report.total} played</span>
            {CATEGORY_LABELS.map((label) => (
              <span key={label} className="meta-chip">
                {label} {report.categories.get(label)!.length}
              </span>
            ))}
          </div>
          {CATEGORY_LABELS.map((label) => {
            const rows = report.categories.get(label)!;
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
      ) : null}
    </div>
  );
}
