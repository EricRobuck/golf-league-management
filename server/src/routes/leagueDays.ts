import express from 'express';
import { SqlitePlayerRepository } from '../repositories/playerRepository';
import { SqliteLeagueDayRepository } from '../repositories/leagueDayRepository';
import { LeagueDay, SelectedPlayer, Team } from '../types/models';
import { generateTeams } from '../utils/teams';

const router = express.Router();
const playerRepository = new SqlitePlayerRepository();
const leagueDayRepository = new SqliteLeagueDayRepository();

router.get('/', async (_req, res, next) => {
  try {
    const leagueDays = await leagueDayRepository.getAll();
    res.json(leagueDays);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const leagueDay = await leagueDayRepository.getById(req.params.id);
    if (!leagueDay) {
      return res.status(404).json({ message: 'League day not found.' });
    }
    res.json(leagueDay);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = req.body as Partial<LeagueDay>;
    if (!payload.date || !payload.courseId || !payload.scoringNine) {
      return res.status(400).json({ message: 'Date, courseId, and scoringNine are required.' });
    }

    const now = new Date().toISOString();
    const leagueDay: LeagueDay = {
      id: `league-day-${payload.date}`,
      date: payload.date,
      courseId: payload.courseId,
      scoringNine: payload.scoringNine,
      status: 'draft',
      selectedPlayers: [],
      teams: [],
      createdAt: now,
      updatedAt: now,
    };

    const created = await leagueDayRepository.create(leagueDay);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const leagueDay = await leagueDayRepository.getById(req.params.id);
    if (!leagueDay) {
      return res.status(404).json({ message: 'League day not found.' });
    }
    const payload = req.body as Partial<Pick<LeagueDay, 'date' | 'courseId' | 'scoringNine'>>;
    if (payload.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
      return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format.' });
    }
    const updated = await leagueDayRepository.update(req.params.id, payload);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/players', async (req, res, next) => {
  try {
    const leagueDay = await leagueDayRepository.getById(req.params.id);
    if (!leagueDay) {
      return res.status(404).json({ message: 'League day not found.' });
    }
    const payload = req.body as { playerId: string };
    const player = await playerRepository.getById(payload.playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found.' });
    }
    if (leagueDay.selectedPlayers.some((entry) => entry.playerId === payload.playerId)) {
      return res.status(409).json({ message: 'Player already selected for this league day.' });
    }
    leagueDay.selectedPlayers.push({
      playerId: payload.playerId,
      selectionOrder: leagueDay.selectedPlayers.length + 1,
    });
    leagueDay.updatedAt = new Date().toISOString();
    await leagueDayRepository.update(leagueDay.id, { selectedPlayers: leagueDay.selectedPlayers, updatedAt: leagueDay.updatedAt });
    res.status(201).json(leagueDay.selectedPlayers);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/players/:playerId', async (req, res, next) => {
  try {
    const leagueDay = await leagueDayRepository.getById(req.params.id);
    if (!leagueDay) {
      return res.status(404).json({ message: 'League day not found.' });
    }
    const index = leagueDay.selectedPlayers.findIndex((entry) => entry.playerId === req.params.playerId);
    if (index === -1) {
      return res.status(404).json({ message: 'Player not found in roster.' });
    }
    leagueDay.selectedPlayers.splice(index, 1);
    leagueDay.selectedPlayers = leagueDay.selectedPlayers.map((entry, idx) => ({ ...entry, selectionOrder: idx + 1 }));
    leagueDay.updatedAt = new Date().toISOString();
    await leagueDayRepository.update(leagueDay.id, { selectedPlayers: leagueDay.selectedPlayers, updatedAt: leagueDay.updatedAt });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.put('/:id/player-order', async (req, res, next) => {
  try {
    const leagueDay = await leagueDayRepository.getById(req.params.id);
    if (!leagueDay) {
      return res.status(404).json({ message: 'League day not found.' });
    }
    const payload = req.body as { selectedPlayers: SelectedPlayer[] };
    leagueDay.selectedPlayers = payload.selectedPlayers;
    leagueDay.updatedAt = new Date().toISOString();
    await leagueDayRepository.update(leagueDay.id, { selectedPlayers: leagueDay.selectedPlayers, updatedAt: leagueDay.updatedAt });
    res.json(leagueDay.selectedPlayers);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/teams', async (req, res, next) => {
  try {
    const leagueDay = await leagueDayRepository.getById(req.params.id);
    if (!leagueDay) {
      return res.status(404).json({ message: 'League day not found.' });
    }
    const payload = req.body as { teams: Team[] };
    leagueDay.teams = payload.teams;
    leagueDay.updatedAt = new Date().toISOString();
    await leagueDayRepository.update(leagueDay.id, { teams: leagueDay.teams, updatedAt: leagueDay.updatedAt });
    res.json(leagueDay.teams);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/generate-teams', async (req, res, next) => {
  try {
    const leagueDay = await leagueDayRepository.getById(req.params.id);
    if (!leagueDay) {
      return res.status(404).json({ message: 'League day not found.' });
    }
    const teams: Team[] = generateTeams(leagueDay.selectedPlayers);
    leagueDay.teams = teams;
    leagueDay.status = 'teamsGenerated';
    leagueDay.updatedAt = new Date().toISOString();
    await leagueDayRepository.update(leagueDay.id, { teams: leagueDay.teams, status: leagueDay.status, updatedAt: leagueDay.updatedAt });
    res.json(teams);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
