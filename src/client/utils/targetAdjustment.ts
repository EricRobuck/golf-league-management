import { Player } from '../types';

// A golfer's TOTAL score vs. total target drives the adjustment: every full 3
// points over/under nudges the total target by 1, capped at a 3-point swing
// per round. Points are applied one at a time, back first: an increase lands
// on the back unless it's already a point ahead of the front (then the front
// catches up), and a decrease comes off the back only while it's ahead (else
// the front gives up the point). This keeps the back always tied with or
// exactly 1 higher than the front, no matter where the pair started.
export function adjustTargets(player: Player, frontScore: number, backScore: number): { frontTarget: number; backTarget: number } {
  const totalDiff = frontScore + backScore - (player.frontTarget + player.backTarget);
  const magnitude = Math.min(3, Math.floor(Math.abs(totalDiff) / 3));
  const sign = totalDiff < 0 ? -1 : 1;

  let front = player.frontTarget;
  let back = player.backTarget;

  for (let i = 0; i < magnitude; i += 1) {
    if (sign > 0) {
      if (back - front < 1) back += 1;
      else front += 1;
    } else if (back - front > 0) {
      back -= 1;
    } else {
      front -= 1;
    }
  }

  return {
    frontTarget: Math.max(0, front),
    backTarget: Math.max(0, back),
  };
}
