type NamedPlayer = { firstName: string; lastName: string };

export function playerLabel(player: NamedPlayer) {
  return `${player.lastName}, ${player.firstName}`;
}

export function compareByLastName(a: NamedPlayer, b: NamedPlayer) {
  const lastNameCompare = a.lastName.localeCompare(b.lastName);
  if (lastNameCompare !== 0) return lastNameCompare;
  return a.firstName.localeCompare(b.firstName);
}
