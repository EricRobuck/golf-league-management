import { describe, expect, it } from 'vitest';
import { buildPairHistory, generateTeams } from '../server/src/utils/teams';
import { LeagueDay } from '../server/src/types/models';

describe('generateTeams', () => {
  function players(count: number) {
    return Array.from({ length: count }, (_, index) => ({ playerId: `player-${index + 1}`, selectionOrder: index + 1 }));
  }

  it('includes every player exactly once', () => {
    const input = players(13);
    const teams = generateTeams(input);
    const ids = teams.flatMap((team) => team.players.map((p) => p.playerId)).sort();
    expect(ids).toEqual(input.map((p) => p.playerId).sort());
  });

  it('numbers teams sequentially starting at 1', () => {
    const teams = generateTeams(players(10));
    expect(teams.map((team) => team.teamNumber)).toEqual(teams.map((_, index) => index + 1));
  });

  it('creates a threesome-only roster for 3 players', () => {
    const teams = generateTeams(players(3));
    expect(teams).toHaveLength(1);
    expect(teams[0].players).toHaveLength(3);
  });

  it('creates one foursome for 4 players', () => {
    const teams = generateTeams(players(4));
    expect(teams).toHaveLength(1);
    expect(teams[0].players).toHaveLength(4);
  });

  it('creates two threesomes for 6 players', () => {
    const teams = generateTeams(players(6));
    expect(teams).toHaveLength(2);
    expect(teams.every((team) => team.players.length === 3)).toBe(true);
  });

  it('creates one threesome and one foursome for 7 players', () => {
    const teams = generateTeams(players(7));
    expect(teams).toHaveLength(2);
    expect(teams.filter((team) => team.players.length === 3)).toHaveLength(1);
    expect(teams.filter((team) => team.players.length === 4)).toHaveLength(1);
  });

  it('creates two threesomes and one foursome for 10 players', () => {
    const teams = generateTeams(players(10));
    expect(teams).toHaveLength(3);
    expect(teams.filter((team) => team.players.length === 3)).toHaveLength(2);
    expect(teams.filter((team) => team.players.length === 4)).toHaveLength(1);
  });

  it('creates three threesomes and one foursome for 13 players', () => {
    const teams = generateTeams(players(13));
    expect(teams).toHaveLength(4);
    expect(teams.filter((team) => team.players.length === 3)).toHaveLength(3);
    expect(teams.filter((team) => team.players.length === 4)).toHaveLength(1);
  });

  it('creates one threesome and three foursomes for 15 players', () => {
    const teams = generateTeams(players(15));
    expect(teams).toHaveLength(4);
    expect(teams.filter((team) => team.players.length === 3)).toHaveLength(1);
    expect(teams.filter((team) => team.players.length === 4)).toHaveLength(3);
  });

  it('places threesomes before foursomes', () => {
    const teams = generateTeams(players(11));
    expect(teams[0].players).toHaveLength(3);
    expect(teams[1].players).toHaveLength(4);
    expect(teams[2].players).toHaveLength(4);
  });

  it('falls back to a single group of 5 when no 3/4 split is possible', () => {
    const teams = generateTeams(players(5));
    expect(teams).toHaveLength(1);
    expect(teams[0].players).toHaveLength(5);
  });

  it('places a goesFirst player into team 1, teeing off first', () => {
    const input = players(7).map((player, index) => (index === 4 ? { ...player, goesFirst: true } : player));
    const teams = generateTeams(input);
    expect(teams[0].players[0].playerId).toBe('player-5');
  });

  it('places multiple goesFirst players into team 1 when they fit', () => {
    const input = players(7).map((player, index) => ([1, 4].includes(index) ? { ...player, goesFirst: true } : player));
    const teams = generateTeams(input);
    const team1Ids = teams[0].players.map((player) => player.playerId);
    expect(team1Ids).toEqual(expect.arrayContaining(['player-2', 'player-5']));
  });

  it('throws for fewer than three golfers', () => {
    expect(() => generateTeams(players(2))).toThrow('At least three golfers are required to construct teams.');
  });

  it('avoids repeating a heavily-paired pair when other options exist', () => {
    const input = players(6);
    const pairHistory = new Map<string, number>([['player-1|player-2', 25]]);

    for (let i = 0; i < 20; i += 1) {
      const teams = generateTeams(input, pairHistory);
      const team1 = teams.find((t) => t.players.some((p) => p.playerId === 'player-1'));
      expect(team1?.players.some((p) => p.playerId === 'player-2')).toBe(false);
    }
  });

  it('falls back to repeating a pair when there is no other option', () => {
    const input = players(3);
    const pairHistory = new Map<string, number>([
      ['player-1|player-2', 10],
      ['player-1|player-3', 10],
      ['player-2|player-3', 10],
    ]);

    const teams = generateTeams(input, pairHistory);
    expect(teams).toHaveLength(1);
    expect(teams[0].players).toHaveLength(3);
  });

  it('with no history, still produces every player exactly once', () => {
    const input = players(10);
    const teams = generateTeams(input, new Map());
    const ids = teams.flatMap((team) => team.players.map((p) => p.playerId)).sort();
    expect(ids).toEqual(input.map((p) => p.playerId).sort());
  });
});

describe('buildPairHistory', () => {
  function leagueDay(id: string, teams: { teamNumber: number; players: string[] }[]): LeagueDay {
    return {
      id,
      date: '2026-01-01',
      courseId: 'Rich Maiden',
      scoringNine: 'both',
      status: 'teamsGenerated',
      selectedPlayers: [],
      teams: teams.map((t) => ({
        teamNumber: t.teamNumber,
        players: t.players.map((playerId, index) => ({ playerId, selectionOrder: index + 1 })),
      })),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  }

  it('counts every pairing within a team', () => {
    const day = leagueDay('day-1', [{ teamNumber: 1, players: ['player-1', 'player-2', 'player-3'] }]);
    const history = buildPairHistory([day]);
    expect(history.get('player-1|player-2')).toBe(1);
    expect(history.get('player-1|player-3')).toBe(1);
    expect(history.get('player-2|player-3')).toBe(1);
  });

  it('accumulates counts across multiple rounds', () => {
    const day1 = leagueDay('day-1', [{ teamNumber: 1, players: ['player-1', 'player-2'] }]);
    const day2 = leagueDay('day-2', [{ teamNumber: 1, players: ['player-1', 'player-2'] }]);
    const history = buildPairHistory([day1, day2]);
    expect(history.get('player-1|player-2')).toBe(2);
  });

  it('excludes the specified league day', () => {
    const day1 = leagueDay('day-1', [{ teamNumber: 1, players: ['player-1', 'player-2'] }]);
    const day2 = leagueDay('day-2', [{ teamNumber: 1, players: ['player-1', 'player-2'] }]);
    const history = buildPairHistory([day1, day2], 'day-2');
    expect(history.get('player-1|player-2')).toBe(1);
  });

  it('is order-independent for a pair key', () => {
    const day = leagueDay('day-1', [{ teamNumber: 1, players: ['player-2', 'player-1'] }]);
    const history = buildPairHistory([day]);
    expect(history.get('player-1|player-2')).toBe(1);
  });
});
