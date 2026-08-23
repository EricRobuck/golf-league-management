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
  goesFirst?: boolean;
  frontScore?: number;
  backScore?: number;
  targetAdjusted?: boolean;
  frontTargetAtSave?: number;
  backTargetAtSave?: number;
};

export type LeagueDay = {
  id: string;
  date: string;
  courseId: string;
  scoringNine: 'front' | 'back' | 'both';
  status: 'draft' | 'teamsGenerated' | 'scoring' | 'finalized' | 'reopened';
  selectedPlayers: SelectedPlayer[];
  teams: Team[];
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
