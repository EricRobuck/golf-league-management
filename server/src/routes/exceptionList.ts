import express from 'express';
import { SqliteExceptionListRepository } from '../repositories/exceptionListRepository';
import { SqlitePlayerRepository } from '../repositories/playerRepository';

const router = express.Router();
const repository = new SqliteExceptionListRepository();
const playerRepository = new SqlitePlayerRepository();

router.get('/', async (_req, res, next) => {
  try {
    const entries = await repository.getAll();
    res.json(entries);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = req.body as { playerId?: string };
    if (!payload.playerId) {
      return res.status(400).json({ message: 'A golfer is required.' });
    }

    const player = await playerRepository.getById(payload.playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found.' });
    }

    const existing = await repository.getAll();
    if (existing.some((entry) => entry.playerId === payload.playerId)) {
      return res.status(409).json({ message: 'This golfer is already on the exception list.' });
    }

    const created = await repository.add(payload.playerId);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.delete('/:playerId', async (req, res, next) => {
  try {
    await repository.remove(req.params.playerId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
