import { SelectedPlayer, Team } from '../types';

export type LateEntryPlan = { teams: Team[]; targetTeamNumber: number; createdNewTeam: boolean };

// A late arrival goes on the bottom of the last threesome, turning it into a
// foursome. If every team is already a foursome, the last player from each
// of the first three teams is pulled off to form a brand new team with the
// late entry, rather than overloading any one team to five.
export function planLateEntry(teams: Team[], newEntry: SelectedPlayer): LateEntryPlan {
  const cloned = teams.map((team) => ({ ...team, players: [...team.players] }));
  const lastThreesomeIndex = cloned.reduce(
    (lastIndex, team, index) => (team.players.length === 3 ? index : lastIndex),
    -1
  );

  if (lastThreesomeIndex !== -1) {
    cloned[lastThreesomeIndex].players.push(newEntry);
    return { teams: cloned, targetTeamNumber: cloned[lastThreesomeIndex].teamNumber, createdNewTeam: false };
  }

  const pulled: SelectedPlayer[] = [];
  for (let i = 0; i < Math.min(3, cloned.length); i += 1) {
    const removed = cloned[i].players.pop();
    if (removed) pulled.push(removed);
  }
  const newTeamNumber = cloned.length + 1;
  cloned.push({ teamNumber: newTeamNumber, players: [...pulled, newEntry] });
  return { teams: cloned, targetTeamNumber: newTeamNumber, createdNewTeam: true };
}
