import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { todayDateString } from '../constants';
import { useCurrentPlayer } from './CurrentPlayerContext';

const ADMIN_PASSWORD = '11235813';
const STORAGE_PREFIX = 'golf-admin-unlocked-';

type AdminUnlockContextValue = {
  isUnlocked: boolean;
  unlock: (password: string) => boolean;
};

const AdminUnlockContext = createContext<AdminUnlockContextValue | null>(null);

export function AdminUnlockProvider({ children }: { children: ReactNode }) {
  const { currentPlayer } = useCurrentPlayer();
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Re-check whenever the active player changes (e.g. "Switch player") so one
  // admin's unlock never carries over to a different player on a shared device.
  useEffect(() => {
    if (!currentPlayer) {
      setIsUnlocked(false);
      return;
    }
    setIsUnlocked(localStorage.getItem(STORAGE_PREFIX + currentPlayer.id) === todayDateString());
  }, [currentPlayer]);

  const unlock = (password: string) => {
    if (!currentPlayer || password !== ADMIN_PASSWORD) {
      return false;
    }
    localStorage.setItem(STORAGE_PREFIX + currentPlayer.id, todayDateString());
    setIsUnlocked(true);
    return true;
  };

  return <AdminUnlockContext.Provider value={{ isUnlocked, unlock }}>{children}</AdminUnlockContext.Provider>;
}

export function useAdminUnlock() {
  const context = useContext(AdminUnlockContext);
  if (!context) {
    throw new Error('useAdminUnlock must be used within an AdminUnlockProvider');
  }
  return context;
}
