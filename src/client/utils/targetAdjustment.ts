import { Player } from '../types';

// A golfer's TOTAL score vs. total target drives the adjustment: every full 3
// points over/under nudges the total target by 1, capped at a 3-point swing
// per round. That swing is split unevenly between front and back instead of
// applied to each independently: 1 => back only, 2 => front and back each,
// 3 (the max) => front 1 / back 2.
function targetDeltas(magnitude: number): { front: number; back: number } {
  switch (magnitude) {
    case 1:
      return { front: 0, back: 1 };
    case 2:
      return { front: 1, back: 1 };
    case 3:
      return { front: 1, back: 2 };
    default:
      return { front: 0, back: 0 };
  }
}

export function adjustTargets(player: Player, frontScore: number, backScore: number): { frontTarget: number; backTarget: number } {
  const totalDiff = frontScore + backScore - (player.frontTarget + player.backTarget);
  const magnitude = Math.min(3, Math.floor(Math.abs(totalDiff) / 3));
  const sign = totalDiff < 0 ? -1 : 1;
  const deltas = targetDeltas(magnitude);
  return {
    frontTarget: Math.max(0, player.frontTarget + sign * deltas.front),
    backTarget: Math.max(0, player.backTarget + sign * deltas.back),
  };
}
