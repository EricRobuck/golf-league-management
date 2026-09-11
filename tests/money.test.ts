import { describe, expect, it } from 'vitest';
import {
  computeMoneyList,
  distributeTeamMoney,
  hasAnyScore,
  teamBackTotal,
  teamDiffTotals,
  teamFrontTotal,
} from '../src/client/utils/money';
import { Player, SelectedPlayer, Team } from '../src/client/types';

function makePlayer(id: string, frontTarget: number, backTarget: number): Player {
  return {
    id,
    firstName: id,
    lastName: 'Golfer',
    frontTarget,
    backTarget,
    isAdmin: false,
    createdAt: '',
    updatedAt: '',
  };
}

function makeEntry(playerId: string, overrides: Partial<SelectedPlayer> = {}): SelectedPlayer {
  return { playerId, selectionOrder: 1, ...overrides };
}

describe('playing-for-points exclusion in money.ts', () => {
  const counted1 = makePlayer('p1', 10, 10);
  const counted2 = makePlayer('p2', 10, 10);
  const counted3 = makePlayer('p3', 10, 10);
  const pointsPlayer = makePlayer('pfp', 0, 0);
  const players = [counted1, counted2, counted3, pointsPlayer];

  const team: Team = {
    teamNumber: 1,
    players: [
      makeEntry('p1', { frontScore: 12, backScore: 12, frontTargetAtSave: 10, backTargetAtSave: 10 }),
      makeEntry('p2', { frontScore: 12, backScore: 12, frontTargetAtSave: 10, backTargetAtSave: 10 }),
      makeEntry('p3', { frontScore: 12, backScore: 12, frontTargetAtSave: 10, backTargetAtSave: 10 }),
      makeEntry('pfp', {
        frontScore: 30,
        backScore: 30,
        frontTargetAtSave: 0,
        backTargetAtSave: 0,
        playingForPoints: true,
        escortId: 'p1',
      }),
    ],
  };

  it('excludes the points player from team front/back totals', () => {
    expect(teamFrontTotal(team)).toBe(36);
    expect(teamBackTotal(team)).toBe(36);
  });

  it('excludes the points player from the win/loss diff even though their diff would dwarf everyone else', () => {
    const diffs = teamDiffTotals(team, players);
    // Each counted player is +2/+2 over target; the points player's +30/+30
    // over a 0/0 target must NOT leak into this sum.
    expect(diffs.frontDiff).toBe(6);
    expect(diffs.backDiff).toBe(6);
    expect(diffs.totalDiff).toBe(12);
  });

  it('splits payouts only across the three counted teammates, not the points player', () => {
    const payouts = distributeTeamMoney(team, players, 9);
    expect(payouts.pfp).toBeUndefined();
    expect(payouts.p1 + payouts.p2 + payouts.p3).toBe(9);
  });

  it('does not count the points player toward the money pot size', () => {
    const rows = computeMoneyList([team], players);
    // categoryPot is $1/category/counted-golfer; with a 3-counted-player,
    // single-team round every category is won outright by the only team.
    const totalPaid = rows.reduce((sum, row) => sum + row.amount, 0);
    // 3 counted golfers * $3 (front+back+total) = $9, not $12 (which the
    // 4th, points-only player would produce if still counted).
    expect(totalPaid).toBe(9);
    expect(rows.find((row) => row.playerId === 'pfp')).toBeUndefined();
  });

  it('ignores the points player entry when checking whether scores exist', () => {
    const onlyPointsPlayerScored: Team = {
      teamNumber: 2,
      players: [
        makeEntry('p1'),
        makeEntry('p2'),
        makeEntry('p3'),
        makeEntry('pfp', { frontScore: 30, backScore: 30, playingForPoints: true }),
      ],
    };
    expect(hasAnyScore([onlyPointsPlayerScored], 'frontScore')).toBe(false);
  });
});
