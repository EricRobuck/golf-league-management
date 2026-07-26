# Golf League Management

React + Express app for running the league: player roster, league days, team generation, and scoring. Data is stored in SQLite (`node:sqlite`).

## Development

```
npm install
npm run dev
```

This runs the Express API on `:4000` and the Vite dev server on `:4173` (proxying `/api` to the Express server). Open `http://localhost:4173`.

## Deploying on Railway

1. Create a new Railway project from this GitHub repo. Railway auto-detects the `build`/`start` scripts via Nixpacks (see `railway.json`), so no manual configuration is required.
2. **Attach a Volume** to the service, mounted at a path of your choice (e.g. `/data`). Without this, the SQLite database resets on every redeploy since Railway's filesystem is otherwise ephemeral.
3. Set the environment variable `DATA_DIR` to that mount path (e.g. `DATA_DIR=/data`). The server will create/read `golf.db` there. On first boot with an empty volume, it seeds itself from the roster committed in `data/players.json` and `data/league-days.json`.
4. `PORT` is set automatically by Railway — the server already reads `process.env.PORT`, no action needed.

## Testing

```
npm test
```
