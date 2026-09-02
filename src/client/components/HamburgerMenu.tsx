import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Player } from '../types';
import { playerLabel } from '../utils/playerName';

type HamburgerMenuProps = {
  currentPlayer: Player;
  isAdmin: boolean;
  switchPlayer: () => void;
};

export default function HamburgerMenu({ currentPlayer, isAdmin, switchPlayer }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <button
        className="hamburger-btn"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
        <span />
      </button>
      {open && <div className="hamburger-overlay" onClick={close} />}
      <nav className={open ? 'hamburger-panel hamburger-panel-open' : 'hamburger-panel'}>
        <div className="current-player-badge">
          <span className="current-player-name">{playerLabel(currentPlayer)}</span>
          <span className="current-player-points">
            Front {currentPlayer.frontTarget} · Back {currentPlayer.backTarget} · Total{' '}
            {currentPlayer.frontTarget + currentPlayer.backTarget}
          </span>
          <button
            className="switch-player-btn"
            title="Not you? Switch golfer"
            onClick={() => {
              close();
              switchPlayer();
            }}
          >
            Switch
          </button>
        </div>
        <Link to="/profile" onClick={close}>
          Profile
        </Link>
        <Link to={`/players/${currentPlayer.id}/stats`} onClick={close}>
          My Stats
        </Link>
        <Link to="/players" onClick={close}>
          Players
        </Link>
        <Link to="/leaderboard" onClick={close}>
          Leaderboard
        </Link>
        <Link to="/group-stats" onClick={close}>
          Group Stats
        </Link>
        <Link to="/points" onClick={close}>
          Today
        </Link>
        <Link to="/past-rounds" onClick={close}>
          Past Rounds
        </Link>
        {isAdmin && (
          <Link to="/enter-score" onClick={close}>
            Admin
          </Link>
        )}
        {isAdmin && (
          <Link to="/status-report" onClick={close}>
            Status Report
          </Link>
        )}
        {isAdmin && (
          <Link to="/player-conflicts" onClick={close}>
            Cannot Play Together
          </Link>
        )}
      </nav>
    </>
  );
}
