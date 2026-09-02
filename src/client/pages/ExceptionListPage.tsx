import { useEffect, useMemo, useState } from 'react';
import { addToExceptionList, getExceptionList, getPlayers, removeFromExceptionList } from '../api';
import { ExceptionEntry, Player } from '../types';
import { playerLabel } from '../utils/playerName';

export default function ExceptionListPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [entries, setEntries] = useState<ExceptionEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = () => {
    Promise.all([getPlayers(), getExceptionList()])
      .then(([playersResult, entriesResult]) => {
        setPlayers(playersResult);
        setEntries(entriesResult);
      })
      .catch(() => setError('Unable to load the exception list.'));
  };

  useEffect(() => {
    load();
  }, []);

  const exceptionIds = useMemo(() => new Set(entries.map((entry) => entry.playerId)), [entries]);

  const availablePlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return players
      .filter((player) => !exceptionIds.has(player.id))
      .filter((player) => !query || playerLabel(player).toLowerCase().includes(query))
      .sort((a, b) => playerLabel(a).localeCompare(playerLabel(b)));
  }, [players, exceptionIds, search]);

  const exceptionPlayers = useMemo(
    () =>
      entries
        .map((entry) => players.find((player) => player.id === entry.playerId))
        .filter((player): player is Player => Boolean(player))
        .sort((a, b) => playerLabel(a).localeCompare(playerLabel(b))),
    [entries, players]
  );

  const addPlayer = async (playerId: string) => {
    try {
      const created = await addToExceptionList(playerId);
      setEntries((current) => [...current, created]);
    } catch (error: any) {
      setError(error.response?.data?.message ?? 'Unable to add golfer.');
    }
  };

  const removePlayer = async (playerId: string) => {
    try {
      await removeFromExceptionList(playerId);
      setEntries((current) => current.filter((entry) => entry.playerId !== playerId));
    } catch (_error) {
      setError('Unable to remove golfer.');
    }
  };

  return (
    <div>
      <div className="page-card select-players-header">
        <div>
          <h2 className="section-title">Exception List</h2>
          <div className="league-day-meta">
            <span className="meta-chip">No two golfers on this list will ever share a team</span>
          </div>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="split-columns">
        <section className="panel">
          <div className="panel-header">
            <h3>Available Golfers</h3>
            <span className="count-badge">{availablePlayers.length}</span>
          </div>
          <div className="panel-search">
            <input
              type="search"
              placeholder="Search golfers..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="panel-body">
            {availablePlayers.length === 0 ? (
              <p className="empty-state">{search ? 'No golfers match your search.' : 'Every golfer is on the list.'}</p>
            ) : (
              <ul className="roster-list">
                {availablePlayers.map((player) => (
                  <li key={player.id} className="roster-item">
                    <div className="player-name">{playerLabel(player)}</div>
                    <button className="button-icon" title="Add to exception list" onClick={() => addPlayer(player.id)}>
                      +
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Exception List</h3>
            <span className="count-badge count-badge-accent">{exceptionPlayers.length}</span>
          </div>
          <div className="panel-body panel-body-no-search">
            {exceptionPlayers.length === 0 ? (
              <p className="empty-state">No golfers on the exception list yet. Add golfers from the list on the left.</p>
            ) : (
              <ul className="roster-list">
                {exceptionPlayers.map((player) => (
                  <li key={player.id} className="roster-item">
                    <div className="player-name">{playerLabel(player)}</div>
                    <button
                      className="button-icon button-icon-danger"
                      title="Remove from exception list"
                      onClick={() => removePlayer(player.id)}
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
