import { LeagueDay, SelectedPlayer, Team } from '../types/models';

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// Counts how many times each pair of players has been on the same team across
// past rounds. Used to steer new teams away from repeat pairings.
export function buildPairHistory(leagueDays: LeagueDay[], excludeLeagueDayId?: string): Map<string, number> {
  const history = new Map<string, number>();
  for (const day of leagueDays) {
    if (day.id === excludeLeagueDayId) continue;
    for (const team of day.teams) {
      for (let i = 0; i < team.players.length; i += 1) {
        for (let j = i + 1; j < team.players.length; j += 1) {
          const key = pairKey(team.players[i].playerId, team.players[j].playerId);
          history.set(key, (history.get(key) ?? 0) + 1);
        }
      }
    }
  }
  return history;
}

function pairScore(candidateId: string, teamPlayerIds: string[], pairHistory: Map<string, number>): number {
  let score = 0;
  for (const id of teamPlayerIds) {
    score += pairHistory.get(pairKey(candidateId, id)) ?? 0;
  }
  return score;
}

// Total pairing weight a player carries against the rest of the field — how
// entangled their history is with everyone else still to be placed.
function totalWeight(playerId: string, others: SelectedPlayer[], pairHistory: Map<string, number>): number {
  let sum = 0;
  for (const other of others) {
    if (other.playerId === playerId) continue;
    sum += pairHistory.get(pairKey(playerId, other.playerId)) ?? 0;
  }
  return sum;
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

function computeTeamSizes(totalPlayers: number): number[] {
  const threesomes = threesomesNeeded(totalPlayers);
  const sizes: number[] = [];
  let remaining = totalPlayers;
  for (let i = 0; i < threesomes; i += 1) {
    sizes.push(3);
    remaining -= 3;
  }
  while (remaining >= 4) {
    sizes.push(4);
    remaining -= 4;
  }
  if (remaining > 0) {
    if (sizes.length > 0) {
      sizes[sizes.length - 1] += remaining;
    } else {
      sizes.push(remaining);
    }
  }
  return sizes;
}

export function generateTeams(players: SelectedPlayer[], pairHistory: Map<string, number> = new Map()): Team[] {
  const totalPlayers = players.length;
  if (totalPlayers < 3) {
    throw new Error('At least three golfers are required to construct teams.');
  }

  const teamSizes = computeTeamSizes(totalPlayers);
  const slots: SelectedPlayer[][] = teamSizes.map(() => []);

  // goesFirst players fill the front slots of team 1 first (so they sit in the
  // first tee-off spots there); any overflow beyond team 1's capacity spills
  // into the front of team 2, and so on.
  const flaggedQueue = shuffle(players.filter((player) => player.goesFirst));
  slots.forEach((slot, i) => {
    while (flaggedQueue.length > 0 && slot.length < teamSizes[i]) {
      slot.push(flaggedQueue.shift()!);
    }
  });

  // Remaining players are placed most-entangled-first: whoever has the most
  // pairing history against the rest of the field gets seated while every
  // team still has room to choose from, into whichever team currently shares
  // the least history with them (ties broken randomly). Players with no
  // conflicting history at all are processed last, since they can go
  // anywhere without creating a repeat. Filling teams in parallel like this
  // (rather than completing one team before starting the next) avoids two
  // conflicting players both being left stranded for the same last team.
  const remaining = players.filter((player) => !player.goesFirst);
  const ordered = shuffle(remaining)
    .map((player) => ({ player, weight: totalWeight(player.playerId, remaining, pairHistory) }))
    .sort((a, b) => b.weight - a.weight)
    .map((entry) => entry.player);

  for (const player of ordered) {
    let bestScore = Infinity;
    let bestSlotIndexes: number[] = [];
    slots.forEach((slot, i) => {
      if (slot.length >= teamSizes[i]) return;
      const score = pairScore(
        player.playerId,
        slot.map((p) => p.playerId),
        pairHistory
      );
      if (score < bestScore) {
        bestScore = score;
        bestSlotIndexes = [i];
      } else if (score === bestScore) {
        bestSlotIndexes.push(i);
      }
    });
    const chosen = bestSlotIndexes[Math.floor(Math.random() * bestSlotIndexes.length)];
    slots[chosen].push(player);
  }

  return slots.map((slotPlayers, i) => ({ teamNumber: i + 1, players: slotPlayers }));
}
