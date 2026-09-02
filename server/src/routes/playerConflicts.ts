import express from 'express';
import { SqlitePlayerConflictRepository } from '../repositories/playerConflictRepository';
import { SqlitePlayerRepository } from '../repositories/playerRepository';

const router = express.Router();
const repository = new SqlitePlayerConflictRepository();
const playerRepository = new SqlitePlayerRepository();

router.get('/', async (_req, res, next) => {
  try {
    const conflicts = await repository.getAll();
    res.json(conflicts);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = req.body as { playerAId?: string; playerBId?: string };
    if (!payload.playerAId || !payload.playerBId) {
      return res.status(400).json({ message: 'Both players are required.' });
    }
    if (payload.playerAId === payload.playerBId) {
      return res.status(400).json({ message: 'A golfer cannot conflict with themselves.' });
    }

    const [playerA, playerB] = await Promise.all([
      playerRepository.getById(payload.playerAId),
      playerRepository.getById(payload.playerBId),
    ]);
    if (!playerA || !playerB) {
      return res.status(404).json({ message: 'Player not found.' });
    }

    const existing = await repository.getAll();
    const duplicate = existing.some(
      (conflict) =>
        (conflict.playerAId === payload.playerAId && conflict.playerBId === payload.playerBId) ||
        (conflict.playerAId === payload.playerBId && conflict.playerBId === payload.playerAId)
    );
    if (duplicate) {
      return res.status(409).json({ message: 'These golfers are already marked as a conflict.' });
    }

    const created = await repository.create(payload.playerAId, payload.playerBId);
    res.status(201).json(created);
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
