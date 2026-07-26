export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  frontTarget: number;
  backTarget: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type SelectedPlayer = {
  playerId: string;
  selectionOrder: number;
  goesFirst?: boolean;
  frontScore?: number;
  backScore?: number;
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
