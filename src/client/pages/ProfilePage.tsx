import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addLeagueDayPlayer, ensureTodayLeagueDay, getLeagueDays, removeLeagueDayPlayer } from '../api';
import { todayDateString } from '../constants';
import { useCurrentPlayer } from '../context/CurrentPlayerContext';
import { LeagueDay, Player, SelectedPlayer } from '../types';

function playerLabel(player: Player) {
  return `${player.firstName} ${player.lastName}`;
}

function playerTotal(player: Player) {
  return player.frontTarget + player.backTarget;
}

function formatDiff(value: number | undefined) {
  if (value === undefined) return '-';
  if (value > 0) return `+${value}`;
  return String(value);
}

function entryDiff(entry: SelectedPlayer, player: Player | undefined, field: 'front' | 'back') {
  if (!player) return undefined;
  if (field === 'front') return entry.frontScore !== undefined ? entry.frontScore - player.frontTarget : undefined;
  return entry.backScore !== undefined ? entry.backScore - player.backTarget : undefined;
}

export default function ProfilePage() {
  const { currentPlayer, players } = useCurrentPlayer();
  const [todayLeagueDay, setTodayLeagueDay] = useState<LeagueDay | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const today = todayDateString();

  const loadTodayLeagueDay = () => {
    getLeagueDays()
      .then((leagueDays) => setTodayLeagueDay(leagueDays.find((day) => day.date === today) ?? null))
      .catch(() => setError("Unable to load today's round."));
  };

  useEffect(() => {
    loadTodayLeagueDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  const isInToday = useMemo(
    () =>
      todayLeagueDay ? todayLeagueDay.selectedPlayers.some((entry) => entry.playerId === currentPlayer?.id) : false,
    [todayLeagueDay, currentPlayer]
  );

  const teamsPicked = Boolean(todayLeagueDay && todayLeagueDay.teams.length > 0);

  const myTeam = useMemo(() => {
    if (!todayLeagueDay || !currentPlayer) return null;
    return todayLeagueDay.teams.find((team) => team.players.some((entry) => entry.playerId === currentPlayer.id)) ?? null;
  }, [todayLeagueDay, currentPlayer]);

  const myTeamTotals = useMemo(() => {
    if (!myTeam) return null;
    let frontNeeded = 0;
    let backNeeded = 0;
    let frontScore = 0;
    let backScore = 0;
    let hasAnyScore = false;
    for (const entry of myTeam.players) {
      const player = players.find((p) => p.id === entry.playerId);
      if (!player) continue;
      frontNeeded += player.frontTarget;
      backNeeded += player.backTarget;
      if (entry.frontScore !== undefined) {
        frontScore += entry.frontScore;
        hasAnyScore = true;
      }
      if (entry.backScore !== undefined) {
        backScore += entry.backScore;
        hasAnyScore = true;
      }
    }
    return {
      frontNeeded,
      backNeeded,
      totalNeeded: frontNeeded + backNeeded,
      frontScore,
      backScore,
      totalScore: frontScore + backScore,
      frontDiff: frontScore - frontNeeded,
      backDiff: backScore - backNeeded,
      totalDiff: frontScore + backScore - (frontNeeded + backNeeded),
      hasAnyScore,
    };
  }, [myTeam, players]);

  const handleJoinToday = async () => {
    if (!currentPlayer) return;
    setJoining(true);
    setError(null);
    try {
      const day = await ensureTodayLeagueDay();
      await addLeagueDayPlayer(day.id, currentPlayer.id);
      loadTodayLeagueDay();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Unable to join today's round.");
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveToday = async () => {
    if (!currentPlayer || !todayLeagueDay) return;
    if (!window.confirm('Are you sure you are not playing today?')) return;
    setLeaving(true);
    setError(null);
    try {
      await removeLeagueDayPlayer(todayLeagueDay.id, currentPlayer.id);
      loadTodayLeagueDay();
    } catch (_err) {
      setError("Unable to check out of today's round.");
    } finally {
      setLeaving(false);
    }
  };

  if (!currentPlayer) return null;

  return (
    <div className="page-card">
      <h2 className="section-title">My Profile</h2>
      {error && <div className="alert">{error}</div>}

      <div className="profile-name">{playerLabel(currentPlayer)}</div>
      <div className="league-day-meta">
        <span className="meta-chip">Front {currentPlayer.frontTarget}</span>
        <span className="meta-chip">Back {currentPlayer.backTarget}</span>
        <span className="meta-chip meta-chip-accent">Total {playerTotal(currentPlayer)}</span>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        {todayLeagueDay === undefined ? (
          <p>Checking today's round...</p>
        ) : !isInToday && teamsPicked ? (
          <p className="empty-state">Teams have already been picked for today — check-in is closed.</p>
        ) : !isInToday ? (
          <button className="button" onClick={handleJoinToday} disabled={joining}>
            {joining ? 'Checking in...' : 'Check In'}
          </button>
        ) : !myTeam ? (
          <>
            <p className="hint-note">You're in for today — waiting for teams to be created.</p>
            <button className="button secondary" style={{ marginTop: '0.75rem' }} onClick={handleLeaveToday} disabled={leaving}>
              {leaving ? 'Checking out...' : 'Check Out'}
            </button>
          </>
        ) : (
          <div className="team-card">
            <h3>Team {myTeam.teamNumber}</h3>
            <div style={{ marginBottom: '1rem' }}>
              <Link className="button" to={`/league-days/${todayLeagueDay!.id}/enter-scores`}>
                Enter Scores
              </Link>
            </div>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Golfer</th>
                    <th>Front Needed</th>
                    <th>Front Score</th>
                    <th>Front +/-</th>
                    <th>Back Needed</th>
                    <th>Back Score</th>
                    <th>Back +/-</th>
                    <th>Total Needed</th>
                    <th>Total Score</th>
                    <th>Total +/-</th>
                  </tr>
                </thead>
                <tbody>
                  {myTeam.players.map((entry) => {
                    const player = players.find((p) => p.id === entry.playerId);
                    if (!player) return null;
                    const frontDiff = entryDiff(entry, player, 'front');
                    const backDiff = entryDiff(entry, player, 'back');
                    const totalDiff = frontDiff !== undefined && backDiff !== undefined ? frontDiff + backDiff : undefined;
                    const totalScore =
                      entry.frontScore !== undefined && entry.backScore !== undefined
                        ? entry.frontScore + entry.backScore
                        : undefined;
                    return (
                      <tr key={entry.playerId}>
                        <td>
                          {playerLabel(player)}
                          {player.id === currentPlayer.id ? ' (You)' : ''}
                        </td>
                        <td>{player.frontTarget}</td>
                        <td>{entry.frontScore ?? '-'}</td>
                        <td>{formatDiff(frontDiff)}</td>
                        <td>{player.backTarget}</td>
                        <td>{entry.backScore ?? '-'}</td>
                        <td>{formatDiff(backDiff)}</td>
                        <td>{playerTotal(player)}</td>
                        <td>{totalScore ?? '-'}</td>
                        <td>{formatDiff(totalDiff)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {myTeamTotals && (
                  <tfoot>
                    <tr style={{ fontWeight: 700, background: '#f8fafc' }}>
                      <td>Team Total</td>
                      <td>{myTeamTotals.frontNeeded}</td>
                      <td>{myTeamTotals.hasAnyScore ? myTeamTotals.frontScore : '-'}</td>
                      <td>{formatDiff(myTeamTotals.hasAnyScore ? myTeamTotals.frontDiff : undefined)}</td>
                      <td>{myTeamTotals.backNeeded}</td>
                      <td>{myTeamTotals.hasAnyScore ? myTeamTotals.backScore : '-'}</td>
                      <td>{formatDiff(myTeamTotals.hasAnyScore ? myTeamTotals.backDiff : undefined)}</td>
                      <td>{myTeamTotals.totalNeeded}</td>
                      <td>{myTeamTotals.hasAnyScore ? myTeamTotals.totalScore : '-'}</td>
                      <td>{formatDiff(myTeamTotals.hasAnyScore ? myTeamTotals.totalDiff : undefined)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
