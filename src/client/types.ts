export type MemberStatus = 'Riding Member' | 'Walking Member' | 'Non Member' | 'Employee';

export type PlayerLeague = 'Locker Room' | 'Perry';

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  frontTarget: number;
  backTarget: number;
  notes?: string;
  isAdmin: boolean;
  status?: MemberStatus;
  league?: PlayerLeague;
  createdAt: string;
  updatedAt: string;
};

export type SelectedPlayer = {
  playerId: string;
  selectionOrder: number;
  assignedTeam?: 1 | 2 | 3;
  frontScore?: number;
  backScore?: number;
  targetAdjusted?: boolean;
  frontTargetAtSave?: number;
  backTargetAtSave?: number;
  // Set when this entry is a golfer playing to establish their points, paired
  // with an existing teammate (escortId) who is already on the team. Their
  // score still feeds their own target adjustment on save, but they're left
  // out of the team's win/loss diff totals and money — see utils/money.ts.
  playingForPoints?: boolean;
  escortId?: string;
};

export type Team = {
  teamNumber: number;
  players: SelectedPlayer[];
};

export type DailyMessage = {
  date: string;
  message: string;
  updatedAt: string | null;
};

export type ExceptionEntry = {
  playerId: string;
  createdAt: string;
};

export type ClosestToPin = {
  frontHole?: 4 | 6 | 8;
  backHole?: 12 | 14 | 17;
  frontWinningTeam?: number;
  backWinningTeam?: number;
};

export type LeagueDay = {
  id: string;
  date: string;
  courseId: string;
  scoringNine: 'front' | 'back' | 'both';
  status: 'draft' | 'teamsGenerated' | 'scoring' | 'finalized' | 'reopened';
  selectedPlayers: SelectedPlayer[];
  teams: Team[];
  closestToPin?: ClosestToPin;
  createdAt: string;
  updatedAt: string;
};
