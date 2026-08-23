import express from 'express';
import { SqliteDailyMessageRepository } from '../repositories/dailyMessageRepository';

const router = express.Router();
const repository = new SqliteDailyMessageRepository();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

router.get('/:date', async (req, res, next) => {
  try {
    if (!DATE_PATTERN.test(req.params.date)) {
      return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format.' });
    }
    const existing = await repository.getByDate(req.params.date);
    res.json(existing ?? { date: req.params.date, message: '', updatedAt: null });
  } catch (error) {
    next(error);
  }
});

router.put('/:date', async (req, res, next) => {
  try {
    if (!DATE_PATTERN.test(req.params.date)) {
      return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format.' });
    }
    const payload = req.body as { message?: string };
    if (typeof payload.message !== 'string') {
      return res.status(400).json({ message: 'Message must be a string.' });
    }
    const updated = await repository.upsert(req.params.date, payload.message);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
