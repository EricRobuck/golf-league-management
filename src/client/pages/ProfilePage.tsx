import { useEffect, useMemo, useState } from 'react';
import { addLeagueDayPlayer, getLeagueDays } from '../api';
import { todayDateString } from '../constants';
import { useCurrentPlayer } from '../context/CurrentPlayerContext';
import { LeagueDay, Player } from '../types';

function playerLabel(player: Player) {
  return `${player.firstName} ${player.lastName}`;
}

function playerTotal(player: Player) {
  return player.frontTarget + player.backTarget;
}

export default function ProfilePage() {
  const { currentPlayer, currentPlayerRank, players } = useCurrentPlayer();
  const [todayLeagueDay, setTodayLeagueDay] = useState<LeagueDay | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
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

  const myTeam = useMemo(() => {
    if (!todayLeagueDay || !currentPlayer) return null;
    return todayLeagueDay.teams.find((team) => team.players.some((entry) => entry.playerId === currentPlayer.id)) ?? null;
  }, [todayLeagueDay, currentPlayer]);

  const myTeamTotals = useMemo(() => {
    if (!myTeam) return null;
    let front = 0;
    let back = 0;
    for (const entry of myTeam.players) {
      const player = players.find((p) => p.id === entry.playerId);
      if (!player) continue;
      front += player.frontTarget;
      back += player.backTarget;
    }
    return { front, back, total: front + back };
  }, [myTeam, players]);

  const handleJoinToday = async () => {
    if (!currentPlayer || !todayLeagueDay) return;
    setJoining(true);
    setError(null);
    try {
      await addLeagueDayPlayer(todayLeagueDay.id, currentPlayer.id);
      loadTodayLeagueDay();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Unable to join today's round.");
    } finally {
      setJoining(false);
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
        {currentPlayerRank && (
          <span className="meta-chip meta-chip-accent">
            Rank #{currentPlayerRank.rank}
            {currentPlayerRank.tieCount > 1 &&
              ` (tied with ${currentPlayerRank.tieCount - 1} other${currentPlayerRank.tieCount - 1 === 1 ? '' : 's'})`}
          </span>
        )}
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        {todayLeagueDay === undefined ? (
          <p>Checking today's round...</p>
        ) : !todayLeagueDay ? (
          <p className="empty-state">No round has been set up for today yet.</p>
        ) : !isInToday ? (
          <button className="button" onClick={handleJoinToday} disabled={joining}>
            {joining ? 'Joining...' : 'Play Today'}
          </button>
        ) : !myTeam ? (
          <p className="hint-note">You're in for today — waiting for teams to be created.</p>
        ) : (
          <div className="team-card">
            <h3>Team {myTeam.teamNumber}</h3>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Golfer</th>
                    <th>Front</th>
                    <th>Back</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {myTeam.players.map((entry) => {
                    const player = players.find((p) => p.id === entry.playerId);
                    if (!player) return null;
                    return (
                      <tr key={entry.playerId}>
                        <td>
                          {playerLabel(player)}
                          {player.id === currentPlayer.id ? ' (You)' : ''}
                        </td>
                        <td>{player.frontTarget}</td>
                        <td>{player.backTarget}</td>
                        <td>{playerTotal(player)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {myTeamTotals && (
                  <tfoot>
                    <tr style={{ fontWeight: 700, background: '#f8fafc' }}>
                      <td>Team Total</td>
                      <td>{myTeamTotals.front}</td>
                      <td>{myTeamTotals.back}</td>
                      <td>{myTeamTotals.total}</td>
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
