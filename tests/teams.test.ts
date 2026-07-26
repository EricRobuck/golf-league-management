import { describe, expect, it } from 'vitest';
import { generateTeams } from '../server/src/utils/teams';

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
});
