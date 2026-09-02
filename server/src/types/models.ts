export type MemberStatus = 'Riding Member' | 'Walking Member' | 'Non Member' | 'Employee';

export const MEMBER_STATUSES: MemberStatus[] = ['Riding Member', 'Walking Member', 'Non Member', 'Employee'];

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

export const CTP_FRONT_HOLES = [4, 6, 8] as const;
export const CTP_BACK_HOLES = [12, 14, 17] as const;

export type ClosestToPin = {
  frontHole?: (typeof CTP_FRONT_HOLES)[number];
  backHole?: (typeof CTP_BACK_HOLES)[number];
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

export type Team = {
  teamNumber: number;
  players: SelectedPlayer[];
};

export type DailyMessage = {
  date: string;
  message: string;
  updatedAt: string;
};

export type PlayerConflict = {
  id: string;
  playerAId: string;
  playerBId: string;
  createdAt: string;
};
