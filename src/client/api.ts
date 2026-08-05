import axios from 'axios';
import { LeagueDay, Player, SelectedPlayer } from './types';
import { DEFAULT_COURSE_ID, DEFAULT_SCORING_NINE, todayDateString } from './constants';

const api = axios.create({
  baseURL: '/api',
});

export async function getPlayers() {
  const response = await api.get<Player[]>('/players');
  return response.data;
}

export async function getPlayer(id: string) {
  const response = await api.get<Player>(`/players/${id}`);
  return response.data;
}

export async function createPlayer(payload: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) {
  const response = await api.post<Player>('/players', payload);
  return response.data;
}

export async function updatePlayer(id: string, payload: Partial<Player>) {
  const response = await api.put<Player>(`/players/${id}`, payload);
  return response.data;
}

export async function patchPlayer(id: string, payload: Partial<Player>) {
  const response = await api.patch<Player>(`/players/${id}`, payload);
  return response.data;
}

export async function getLeagueDays() {
  const response = await api.get<LeagueDay[]>('/league-days');
  return response.data;
}

export async function getLeagueDay(id: string) {
  const response = await api.get<LeagueDay>(`/league-days/${id}`);
  return response.data;
}

export async function createLeagueDay(payload: Omit<LeagueDay, 'id' | 'createdAt' | 'updatedAt' | 'selectedPlayers' | 'teams' | 'status'>) {
  const response = await api.post<LeagueDay>('/league-days', payload);
  return response.data;
}

export async function patchLeagueDay(id: string, payload: Partial<Pick<LeagueDay, 'date' | 'courseId' | 'scoringNine' | 'status'>>) {
  const response = await api.patch<LeagueDay>(`/league-days/${id}`, payload);
  return response.data;
}

// Every round is played at Rich Maiden, scoring both nines, on the day it's created.
export async function ensureTodayLeagueDay() {
  const today = todayDateString();
  const leagueDays = await getLeagueDays();
  const existing = leagueDays.find((day) => day.date === today);
  if (existing) return existing;
  return createLeagueDay({ date: today, courseId: DEFAULT_COURSE_ID, scoringNine: DEFAULT_SCORING_NINE });
}

export async function addLeagueDayPlayer(leagueDayId: string, playerId: string) {
  const response = await api.post<SelectedPlayer[]>(`/league-days/${leagueDayId}/players`, { playerId });
  return response.data;
}

export async function removeLeagueDayPlayer(leagueDayId: string, playerId: string) {
  await api.delete(`/league-days/${leagueDayId}/players/${playerId}`);
}

export async function updateLeagueDayPlayerOrder(leagueDayId: string, selectedPlayers: SelectedPlayer[]) {
  const response = await api.put<SelectedPlayer[]>(`/league-days/${leagueDayId}/player-order`, { selectedPlayers });
  return response.data;
}

export async function generateLeagueDayTeams(leagueDayId: string) {
  const response = await api.post(`/league-days/${leagueDayId}/generate-teams`);
  return response.data;
}

export async function updateLeagueDayTeams(leagueDayId: string, teams: { teamNumber: number; players: SelectedPlayer[] }[]) {
  const response = await api.put(`/league-days/${leagueDayId}/teams`, { teams });
  return response.data;
}
