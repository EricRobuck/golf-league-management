import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SqlitePlayerRepository } from '../repositories/playerRepository';
import { MEMBER_STATUSES, Player } from '../types/models';

const router = express.Router();
const repository = new SqlitePlayerRepository();

function isValidTarget(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

// null means "no status set" — the DB column is nullable and round-trips as
// null (not undefined) for players who haven't been assigned one yet.
function isValidStatus(value: unknown): value is Player['status'] | null {
  return value === null || (typeof value === 'string' && (MEMBER_STATUSES as string[]).includes(value));
}

router.get('/', async (_req, res, next) => {
  try {
    const players = await repository.getAll();
    res.json(players);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const player = await repository.getById(req.params.id);
    if (!player) {
      return res.status(404).json({ message: 'Player not found.' });
    }
    res.json(player);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = req.body as Partial<Player>;
    if (!payload.firstName || !payload.lastName) {
      return res.status(400).json({ message: 'First name and last name are required.' });
    }
    if (!isValidTarget(payload.frontTarget)) {
      return res.status(400).json({ message: 'Front target must be a non-negative integer.' });
    }
    if (!isValidTarget(payload.backTarget)) {
      return res.status(400).json({ message: 'Back target must be a non-negative integer.' });
    }
    if (payload.status !== undefined && !isValidStatus(payload.status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const players = await repository.getAll();
    const duplicate = players.find(
      (player) => player.firstName === payload.firstName && player.lastName === payload.lastName
    );
    if (duplicate) {
      return res.status(409).json({ message: 'A golfer with the same name already exists.' });
    }

    const now = new Date().toISOString();
    const player: Player = {
      id: `player-${uuidv4()}`,
      firstName: payload.firstName,
      lastName: payload.lastName,
      frontTarget: payload.frontTarget,
      backTarget: payload.backTarget,
      notes: payload.notes,
      isAdmin: false,
      status: payload.status,
      createdAt: now,
      updatedAt: now,
    };

    const created = await repository.create(player);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = req.body as Partial<Player>;
    if (!payload.firstName || !payload.lastName) {
      return res.status(400).json({ message: 'First name and last name are required.' });
    }
    if (!isValidTarget(payload.frontTarget)) {
      return res.status(400).json({ message: 'Front target must be a non-negative integer.' });
    }
    if (!isValidTarget(payload.backTarget)) {
      return res.status(400).json({ message: 'Back target must be a non-negative integer.' });
    }
    if (payload.status !== undefined && !isValidStatus(payload.status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const updated = await repository.update(req.params.id, payload);
    if (!updated) {
      return res.status(404).json({ message: 'Player not found.' });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const payload = req.body as Partial<Player>;
    if (payload.frontTarget !== undefined && (!Number.isInteger(payload.frontTarget) || payload.frontTarget < 0)) {
      return res.status(400).json({ message: 'Front target must be a non-negative integer.' });
    }
    if (payload.backTarget !== undefined && (!Number.isInteger(payload.backTarget) || payload.backTarget < 0)) {
      return res.status(400).json({ message: 'Back target must be a non-negative integer.' });
    }
    if (payload.isAdmin !== undefined && typeof payload.isAdmin !== 'boolean') {
      return res.status(400).json({ message: 'isAdmin must be a boolean.' });
    }
    if (payload.status !== undefined && !isValidStatus(payload.status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const updated = await repository.update(req.params.id, payload);
    if (!updated) {
      return res.status(404).json({ message: 'Player not found.' });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await repository.delete(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
