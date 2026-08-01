import { ReactElement } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import PlayersPage from './pages/PlayersPage';
import AddPlayerPage from './pages/AddPlayerPage';
import EditPlayerPage from './pages/EditPlayerPage';
import LeagueDaysPage from './pages/LeagueDaysPage';
import SelectPlayersPage from './pages/SelectPlayersPage';
import GeneratedTeamsPage from './pages/GeneratedTeamsPage';
import ViewPointsPage from './pages/ViewPointsPage';
import TeamScoresPage from './pages/TeamScoresPage';
import TodayScorePage from './pages/TodayScorePage';
import WhoAreYouPage from './pages/WhoAreYouPage';
import ProfilePage from './pages/ProfilePage';
import { useCurrentPlayer } from './context/CurrentPlayerContext';

function AdminRoute({ children }: { children: ReactElement }) {
  const { currentPlayer } = useCurrentPlayer();
  if (!currentPlayer?.isAdmin) {
    return <Navigate to="/profile" replace />;
  }
  return children;
}

export default function App() {
  const { currentPlayer, loading, switchPlayer } = useCurrentPlayer();

  if (loading) {
    return (
      <div className="app-shell">
        <main>
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  if (!currentPlayer) {
    return (
      <div className="app-shell">
        <WhoAreYouPage />
      </div>
    );
  }

  const isAdmin = currentPlayer.isAdmin;

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Golf League Management</h1>
        <div className="current-player-badge">
          <span className="current-player-name">
            {currentPlayer.firstName} {currentPlayer.lastName}
          </span>
          <span className="current-player-points">
            Front {currentPlayer.frontTarget} · Back {currentPlayer.backTarget} · Total{' '}
            {currentPlayer.frontTarget + currentPlayer.backTarget}
          </span>
          <button className="switch-player-btn" title="Not you? Switch golfer" onClick={switchPlayer}>
            Switch
          </button>
        </div>
        <nav>
          <Link to="/profile">Profile</Link>
          <Link to="/players">Players</Link>
          {isAdmin && <Link to="/league-days">Role Call</Link>}
          {isAdmin && <Link to="/players/add">Add Player</Link>}
          <Link to="/points">View Points</Link>
          {isAdmin && <Link to="/enter-score">Enter Score</Link>}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/profile" replace />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route
            path="/players/add"
            element={
              <AdminRoute>
                <AddPlayerPage />
              </AdminRoute>
            }
          />
          <Route
            path="/players/edit/:id"
            element={
              <AdminRoute>
                <EditPlayerPage />
              </AdminRoute>
            }
          />
          <Route
            path="/league-days"
            element={
              <AdminRoute>
                <LeagueDaysPage />
              </AdminRoute>
            }
          />
          <Route
            path="/league-days/:id/select"
            element={
              <AdminRoute>
                <SelectPlayersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/league-days/:id/teams"
            element={
              <AdminRoute>
                <GeneratedTeamsPage />
              </AdminRoute>
            }
          />
          <Route path="/league-days/:id/scores" element={<TeamScoresPage />} />
          <Route
            path="/enter-score"
            element={
              <AdminRoute>
                <TodayScorePage />
              </AdminRoute>
            }
          />
          <Route path="/points" element={<ViewPointsPage />} />
        </Routes>
      </main>
    </div>
  );
}
