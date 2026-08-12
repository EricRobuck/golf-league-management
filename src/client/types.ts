export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  frontTarget: number;
  backTarget: number;
  notes?: string;
  isAdmin: boolean;
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
};

export type Team = {
  teamNumber: number;
  players: SelectedPlayer[];
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
