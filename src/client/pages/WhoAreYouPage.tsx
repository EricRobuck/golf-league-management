import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentPlayer } from '../context/CurrentPlayerContext';
import { playerLabel } from '../utils/playerName';

export default function WhoAreYouPage() {
  const { players, ranks, loading, error, selectPlayer } = useCurrentPlayer();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleSelect = (playerId: string) => {
    selectPlayer(playerId);
    navigate('/profile', { replace: true });
  };

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return players
      .filter((player) => !query || playerLabel(player).toLowerCase().includes(query))
      .sort((a, b) => playerLabel(a).localeCompare(playerLabel(b)));
  }, [players, search]);

  return (
    <div className="who-are-you-shell">
      <div className="page-card who-are-you-card">
        <h1 className="section-title">Who are you?</h1>
        <p className="hint-note">Pick your name to continue.</p>
        {error && <div className="alert">{error}</div>}
        {loading ? (
          <p>Loading golfers...</p>
        ) : (
          <>
            <div className="panel-search">
              <input
                type="search"
                placeholder="Search golfers..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                autoFocus
              />
            </div>
            <ul className="roster-list who-are-you-list">
              {filteredPlayers.map((player) => {
                const rankInfo = ranks.get(player.id);
                return (
                  <li key={player.id} className="roster-item">
                    <button className="who-are-you-option" onClick={() => handleSelect(player.id)}>
                      <span className="player-name">{playerLabel(player)}</span>
                      <span className="player-meta">
                        Front {player.frontTarget} · Back {player.backTarget} · Total{' '}
                        {player.frontTarget + player.backTarget}
                        {rankInfo && (
                          <>
                            {' '}
                            · Rank #{rankInfo.rank}
                            {rankInfo.tieCount > 1 &&
                              ` (tied with ${rankInfo.tieCount - 1} other${rankInfo.tieCount - 1 === 1 ? '' : 's'})`}
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {filteredPlayers.length === 0 && <p className="empty-state">No golfers match your search.</p>}
          </>
        )}
      </div>
    </div>
  );
}
