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
  const today = todayDateString();
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    Promise.all([getLeagueDays(), getPlayers()])
      .then(([leagueDaysResult, playersResult]) => {
        setLeagueDays(leagueDaysResult);
        setPlayers(playersResult);
      })
      .catch(() => setError('Unable to load the status report.'));
  }, []);

  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  const availableDates = useMemo(() => {
    const dates = new Set(leagueDays.filter((day) => day.teams.length > 0).map((day) => day.date));
    dates.add(today);
    return [...dates].sort((a, b) => b.localeCompare(a));
  }, [leagueDays, today]);

  const selectedDay = useMemo(() => leagueDays.find((day) => day.date === selectedDate), [leagueDays, selectedDate]);

  const report = useMemo(() => {
    if (!selectedDay || selectedDay.teams.length === 0) return null;
    const playerIds = new Set(selectedDay.teams.flatMap((team) => team.players.map((entry) => entry.playerId)));
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
  }, [selectedDay, byId]);

  return (
    <div className="page-card">
      <h2 className="section-title">Status Report</h2>
      {error && <div className="alert">{error}</div>}
      <div className="form-field" style={{ maxWidth: '16rem', marginBottom: '1.25rem' }}>
        <label>Date</label>
        <select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>
          {availableDates.map((date) => (
            <option key={date} value={date}>
              {date === today ? `${date} (Today)` : date}
            </option>
          ))}
        </select>
      </div>
      {!error && !report ? (
        <p className="empty-state">
          {selectedDay ? "Teams haven't been generated for that round yet." : 'No round has been created for that day yet.'}
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
