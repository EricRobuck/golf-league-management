import express from 'express';
import { SqlitePlayerRepository } from '../repositories/playerRepository';
import { SqliteLeagueDayRepository } from '../repositories/leagueDayRepository';
import { ClosestToPin, CTP_BACK_HOLES, CTP_FRONT_HOLES, LeagueDay, SelectedPlayer, Team } from '../types/models';
import { buildPairHistory, buildRotationRestrictions, generateTeams } from '../utils/teams';

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
    const payload = req.body as Partial<Pick<LeagueDay, 'date' | 'courseId' | 'scoringNine' | 'status'>>;
    if (payload.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
      return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format.' });
    }
    const validStatuses = ['draft', 'teamsGenerated', 'scoring', 'finalized', 'reopened'];
    if (payload.status !== undefined && !validStatuses.includes(payload.status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }
    const updated = await leagueDayRepository.update(req.params.id, payload);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const leagueDay = await leagueDayRepository.getById(req.params.id);
    if (!leagueDay) {
      return res.status(404).json({ message: 'League day not found.' });
    }
    await leagueDayRepository.delete(req.params.id);
    res.status(204).end();
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

router.put('/:id/closest-to-pin', async (req, res, next) => {
  try {
    const leagueDay = await leagueDayRepository.getById(req.params.id);
    if (!leagueDay) {
      return res.status(404).json({ message: 'League day not found.' });
    }
    // A field of `null` explicitly clears it back to unset; `undefined` (an
    // omitted key) leaves whatever is already saved untouched — JSON drops
    // undefined keys entirely, so this is the only way a client can signal
    // "leave this alone" vs. "reset this" in the same partial-update request.
    const payload = req.body as {
      frontHole?: number | null;
      backHole?: number | null;
      frontWinningTeam?: number | null;
      backWinningTeam?: number | null;
    };
    const teamNumbers = new Set(leagueDay.teams.map((team) => team.teamNumber));

    if (payload.frontHole != null && !(CTP_FRONT_HOLES as readonly number[]).includes(payload.frontHole)) {
      return res.status(400).json({ message: 'Front hole must be 4, 6, or 8.' });
    }
    if (payload.backHole != null && !(CTP_BACK_HOLES as readonly number[]).includes(payload.backHole)) {
      return res.status(400).json({ message: 'Back hole must be 12, 14, or 17.' });
    }
    if (payload.frontWinningTeam != null && !teamNumbers.has(payload.frontWinningTeam)) {
      return res.status(400).json({ message: 'Front winning team is not a team in this round.' });
    }
    if (payload.backWinningTeam != null && !teamNumbers.has(payload.backWinningTeam)) {
      return res.status(400).json({ message: 'Back winning team is not a team in this round.' });
    }

    const closestToPin: ClosestToPin = { ...leagueDay.closestToPin };
    if (payload.frontHole !== undefined) closestToPin.frontHole = (payload.frontHole ?? undefined) as ClosestToPin['frontHole'];
    if (payload.backHole !== undefined) closestToPin.backHole = (payload.backHole ?? undefined) as ClosestToPin['backHole'];
    if (payload.frontWinningTeam !== undefined) closestToPin.frontWinningTeam = payload.frontWinningTeam ?? undefined;
    if (payload.backWinningTeam !== undefined) closestToPin.backWinningTeam = payload.backWinningTeam ?? undefined;

    const updatedAt = new Date().toISOString();
    await leagueDayRepository.update(leagueDay.id, { closestToPin, updatedAt });
    res.json(closestToPin);
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
    const allLeagueDays = await leagueDayRepository.getAll();
    const pairHistory = buildPairHistory(allLeagueDays, leagueDay.id);
    const rotationRestrictions = buildRotationRestrictions(allLeagueDays, leagueDay.date, leagueDay.id);
    const teams: Team[] = generateTeams(leagueDay.selectedPlayers, pairHistory, rotationRestrictions);
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
