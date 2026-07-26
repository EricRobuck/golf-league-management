import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { getPlayers } from '../api';
import { Player } from '../types';

const STORAGE_KEY = 'golf-current-player-id';

export type RankInfo = {
  rank: number;
  tieCount: number;
};

function totalScore(player: Player) {
  return player.frontTarget + player.backTarget;
}

// Standard competition ranking: tied players share the same rank, and the
// next distinct score skips ahead by the number of players tied above it
// (e.g. two players tied for 1st means the next player is ranked 3rd).
function computeRanks(players: Player[]): Map<string, RankInfo> {
  const sorted = [...players].sort((a, b) => totalScore(b) - totalScore(a));
  const ranks = new Map<string, RankInfo>();
  let i = 0;
  while (i < sorted.length) {
    const score = totalScore(sorted[i]);
    let j = i;
    while (j < sorted.length && totalScore(sorted[j]) === score) {
      j += 1;
    }
    const tieCount = j - i;
    const rank = i + 1;
    for (let k = i; k < j; k += 1) {
      ranks.set(sorted[k].id, { rank, tieCount });
    }
    i = j;
  }
  return ranks;
}

type CurrentPlayerContextValue = {
  players: Player[];
  currentPlayer: Player | null;
  currentPlayerRank: RankInfo | null;
  ranks: Map<string, RankInfo>;
  loading: boolean;
  error: string | null;
  selectPlayer: (playerId: string) => void;
  switchPlayer: () => void;
};

const CurrentPlayerContext = createContext<CurrentPlayerContextValue | null>(null);

export function CurrentPlayerProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlayers()
      .then(setPlayers)
      .catch(() => setError('Unable to load golfers.'))
      .finally(() => setLoading(false));
  }, []);

  const currentPlayer = players.find((player) => player.id === currentPlayerId) ?? null;
  const ranks = useMemo(() => computeRanks(players), [players]);
  const currentPlayerRank = currentPlayer ? ranks.get(currentPlayer.id) ?? null : null;

  useEffect(() => {
    if (!loading && currentPlayerId && !currentPlayer) {
      localStorage.removeItem(STORAGE_KEY);
      setCurrentPlayerId(null);
    }
  }, [loading, currentPlayerId, currentPlayer]);

  const selectPlayer = (playerId: string) => {
    localStorage.setItem(STORAGE_KEY, playerId);
    setCurrentPlayerId(playerId);
  };

  const switchPlayer = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentPlayerId(null);
  };

  return (
    <CurrentPlayerContext.Provider
      value={{ players, currentPlayer, currentPlayerRank, ranks, loading, error, selectPlayer, switchPlayer }}
    >
      {children}
    </CurrentPlayerContext.Provider>
  );
}

export function useCurrentPlayer() {
  const context = useContext(CurrentPlayerContext);
  if (!context) {
    throw new Error('useCurrentPlayer must be used within a CurrentPlayerProvider');
  }
  return context;
}
