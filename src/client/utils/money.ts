import { Player, SelectedPlayer, Team } from '../types';

export function teamFrontTotal(team: Team) {
  return team.players.reduce((total, entry) => total + (entry.frontScore ?? 0), 0);
}

export function teamBackTotal(team: Team) {
  return team.players.reduce((total, entry) => total + (entry.backScore ?? 0), 0);
}

export function teamTotal(team: Team) {
  return teamFrontTotal(team) + teamBackTotal(team);
}

export function teamDiffTotals(team: Team, players: Player[]) {
  let frontDiff = 0;
  let backDiff = 0;
  for (const entry of team.players) {
    const player = players.find((p) => p.id === entry.playerId);
    if (!player) continue;
    if (entry.frontScore !== undefined) frontDiff += entry.frontScore - player.frontTarget;
    if (entry.backScore !== undefined) backDiff += entry.backScore - player.backTarget;
  }
  return { frontDiff, backDiff, totalDiff: frontDiff + backDiff };
}

type DiffKey = 'frontDiff' | 'backDiff' | 'totalDiff';

export function findWinners(teams: Team[], players: Player[], key: DiffKey) {
  const withDiffs = teams.map((team) => ({ team, diffs: teamDiffTotals(team, players) }));
  const best = Math.max(...withDiffs.map((entry) => entry.diffs[key]));
  return {
    teams: withDiffs.filter((entry) => entry.diffs[key] === best).map((entry) => entry.team),
    value: best,
  };
}

export function hasAnyScore(teams: Team[], field: 'frontScore' | 'backScore') {
  return teams.some((team) => team.players.some((entry) => entry[field] !== undefined));
}

// Every player on every team must have both scores entered before the round's
// winners (and money) are final — partial data can make a leading team look
// like the winner when scores are still coming in.
export function isRoundComplete(teams: Team[]) {
  return (
    teams.length > 0 &&
    teams.every((team) => team.players.every((entry) => entry.frontScore !== undefined && entry.backScore !== undefined))
  );
}

// When multiple teams tie for a category win, that category's pot is split evenly
// across the tied teams (not paid out in full to each), with any leftover dollar
// going to the lowest-numbered team so the total paid never exceeds the pot.
export function splitPotAmongTeams(pot: number, winningTeamNumbers: number[]): Record<number, number> {
  const shares: Record<number, number> = {};
  if (winningTeamNumbers.length === 0 || pot === 0) return shares;

  const base = Math.floor(pot / winningTeamNumbers.length);
  const remainder = pot - base * winningTeamNumbers.length;
  const ordered = [...winningTeamNumbers].sort((a, b) => a - b);

  ordered.forEach((teamNumber, index) => {
    shares[teamNumber] = base + (index < remainder ? 1 : 0);
  });

  return shares;
}

export function individualDiff(entry: SelectedPlayer, player: Player | undefined, category: 'front' | 'back' | 'total') {
  if (!player) return undefined;
  if (category === 'front') return entry.frontScore !== undefined ? entry.frontScore - player.frontTarget : undefined;
  if (category === 'back') return entry.backScore !== undefined ? entry.backScore - player.backTarget : undefined;
  const front = entry.frontScore !== undefined ? entry.frontScore - player.frontTarget : undefined;
  const back = entry.backScore !== undefined ? entry.backScore - player.backTarget : undefined;
  return front !== undefined && back !== undefined ? front + back : undefined;
}

export function formatMoney(amount: number) {
  return `$${amount}`;
}

// A team's winnings across every category it won are pooled into a single lump sum and
// split evenly across its own members in one pass, so no teammate can end up more than
// $1 apart from another. (Splitting front/back/total separately would let the same top
// performer collect the leftover dollar in each category, compounding into a bigger gap.)
// When the lump sum doesn't divide evenly, the extra dollars go to whichever teammates
// had the better individual differential overall.
export function distributeTeamMoney(team: Team, players: Player[], pot: number) {
  const members = team.players;
  const payouts: Record<string, number> = {};
  if (members.length === 0 || pot === 0) return payouts;

  const base = Math.floor(pot / members.length);
  const remainder = pot - base * members.length;

  for (const entry of members) {
    payouts[entry.playerId] = base;
  }

  const ordered = [...members].sort((a, b) => {
    const playerA = players.find((p) => p.id === a.playerId);
    const playerB = players.find((p) => p.id === b.playerId);
    const diffA = individualDiff(a, playerA, 'total') ?? -Infinity;
    const diffB = individualDiff(b, playerB, 'total') ?? -Infinity;
    return diffB - diffA;
  });

  for (let i = 0; i < remainder; i += 1) {
    payouts[ordered[i].playerId] += 1;
  }

  return payouts;
}

export type MoneyRow = {
  playerId: string;
  player: Player | undefined;
  teamNumber: number;
  amount: number;
  categoriesWon: string[];
};

// $3 per golfer, split evenly across front/back/total (each category's pot equals the golfer count).
export function computeMoneyList(teams: Team[], players: Player[]): MoneyRow[] {
  const playerCount = new Set(teams.flatMap((team) => team.players.map((entry) => entry.playerId))).size;
  const categoryPot = playerCount;

  const frontHasScores = hasAnyScore(teams, 'frontScore');
  const backHasScores = hasAnyScore(teams, 'backScore');
  const totalHasScores = frontHasScores || backHasScores;

  const frontWinners = findWinners(teams, players, 'frontDiff');
  const backWinners = findWinners(teams, players, 'backDiff');
  const totalWinners = findWinners(teams, players, 'totalDiff');

  const frontShares = frontHasScores ? splitPotAmongTeams(categoryPot, frontWinners.teams.map((team) => team.teamNumber)) : {};
  const backShares = backHasScores ? splitPotAmongTeams(categoryPot, backWinners.teams.map((team) => team.teamNumber)) : {};
  const totalShares = totalHasScores ? splitPotAmongTeams(categoryPot, totalWinners.teams.map((team) => team.teamNumber)) : {};

  const rows: MoneyRow[] = [];

  for (const team of teams) {
    const frontShare = frontShares[team.teamNumber] ?? 0;
    const backShare = backShares[team.teamNumber] ?? 0;
    const totalShare = totalShares[team.teamNumber] ?? 0;
    const pot = frontShare + backShare + totalShare;
    if (pot === 0) continue;

    const categoriesWon = [
      frontShare > 0 ? 'Front' : null,
      backShare > 0 ? 'Back' : null,
      totalShare > 0 ? 'Total' : null,
    ].filter((label): label is string => label !== null);

    const payouts = distributeTeamMoney(team, players, pot);
    for (const entry of team.players) {
      const amount = payouts[entry.playerId] ?? 0;
      if (amount <= 0) continue;
      rows.push({
        playerId: entry.playerId,
        player: players.find((p) => p.id === entry.playerId),
        teamNumber: team.teamNumber,
        amount,
        categoriesWon,
      });
    }
  }

  return rows;
}
