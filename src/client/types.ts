export type MemberStatus = 'Riding Member' | 'Walking Member' | 'Non Member' | 'Employee';

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  frontTarget: number;
  backTarget: number;
  notes?: string;
  isAdmin: boolean;
  status?: MemberStatus;
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
