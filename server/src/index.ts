import express from 'express';
import cors from 'cors';
import path from 'path';
import playerRoutes from './routes/players';
import leagueDayRoutes from './routes/leagueDays';
import dailyMessageRoutes from './routes/dailyMessage';
import exceptionListRoutes from './routes/exceptionList';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

app.use('/api/players', playerRoutes);
app.use('/api/league-days', leagueDayRoutes);
app.use('/api/daily-message', dailyMessageRoutes);
app.use('/api/exception-list', exceptionListRoutes);

const clientDist = path.resolve(__dirname, '../../dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next(err);
  });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'An unexpected server error occurred.' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
