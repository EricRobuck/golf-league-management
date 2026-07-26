import { SelectedPlayer, Team } from '../types/models';

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Number of threesomes needed so the remaining players divide evenly into foursomes.
// 5 players is the one count with no valid 3/4 split (Frobenius number for coins {3,4});
// the leftover-merge below folds it into a single group of 5 as a fallback.
function threesomesNeeded(totalPlayers: number): number {
  switch (totalPlayers % 4) {
    case 1:
      return totalPlayers >= 9 ? 3 : 0;
    case 2:
      return 2;
    case 3:
      return 1;
    default:
      return 0;
  }
}

export function generateTeams(players: SelectedPlayer[]): Team[] {
  const totalPlayers = players.length;
  if (totalPlayers < 3) {
    throw new Error('At least three golfers are required to construct teams.');
  }

  // goesFirst players are placed at the very front of the pool so they fill team 1
  // first (and sit in the first tee-off spots there); any overflow beyond team 1's
  // capacity spills into the front of team 2, and so on.
  const flagged = shuffle(players.filter((player) => player.goesFirst));
  const unflagged = shuffle(players.filter((player) => !player.goesFirst));
  const orderedPlayers = [...flagged, ...unflagged];

  const threesomes = threesomesNeeded(totalPlayers);

  const teams: Team[] = [];
  let index = 0;
  let teamNumber = 1;

  for (let i = 0; i < threesomes; i += 1) {
    teams.push({ teamNumber: teamNumber++, players: orderedPlayers.slice(index, index + 3) });
    index += 3;
  }

  while (totalPlayers - index >= 4) {
    teams.push({ teamNumber: teamNumber++, players: orderedPlayers.slice(index, index + 4) });
    index += 4;
  }

  if (index < totalPlayers) {
    const leftover = orderedPlayers.slice(index);
    if (teams.length > 0) {
      teams[teams.length - 1].players.push(...leftover);
    } else {
      teams.push({ teamNumber: teamNumber++, players: leftover });
    }
  }

  return teams;
}
