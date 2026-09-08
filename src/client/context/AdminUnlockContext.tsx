import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useCurrentPlayer } from './CurrentPlayerContext';

const ADMIN_PASSWORD = '11235813';

type AdminUnlockContextValue = {
  isUnlocked: boolean;
  unlock: (password: string) => boolean;
};

const AdminUnlockContext = createContext<AdminUnlockContextValue | null>(null);

export function AdminUnlockProvider({ children }: { children: ReactNode }) {
  const { currentPlayer } = useCurrentPlayer();
  const [unlockedPlayerId, setUnlockedPlayerId] = useState<string | null>(null);

  // Not persisted to storage on purpose: every fresh check-in (picking who
  // you are) must re-enter the password, even if this same admin already
  // unlocked earlier today.
  useEffect(() => {
    setUnlockedPlayerId(null);
  }, [currentPlayer?.id]);

  const unlock = (password: string) => {
    if (!currentPlayer || password !== ADMIN_PASSWORD) {
      return false;
    }
    setUnlockedPlayerId(currentPlayer.id);
    return true;
  };

  const isUnlocked = currentPlayer !== null && unlockedPlayerId === currentPlayer.id;

  return <AdminUnlockContext.Provider value={{ isUnlocked, unlock }}>{children}</AdminUnlockContext.Provider>;
}

export function useAdminUnlock() {
  const context = useContext(AdminUnlockContext);
  if (!context) {
    throw new Error('useAdminUnlock must be used within an AdminUnlockProvider');
  }
  return context;
}
