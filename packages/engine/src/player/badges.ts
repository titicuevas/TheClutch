import type { BadgeId, Player, SeasonRecord } from "../state/types";

const CAP = 5;

export function unlockBadges(player: Player, history: SeasonRecord[]): BadgeId[] {
  const have = new Set(player.badges);
  const last = history.at(-1);
  const prev = history.at(-2);
  if (!last) return player.badges;

  const add = (id: BadgeId) => {
    if (have.size >= CAP || have.has(id)) return;
    have.add(id);
  };

  const years = (pred: (season: SeasonRecord) => boolean) => history.filter(pred).length;

  if (years((s) => s.stats.tpPct >= 0.36 && s.stats.pts >= 12) >= 2) add("sharpshooter");
  if (
    (player.position === "PG" || player.position === "SG") &&
    years((s) => s.stats.ast >= 6.5 && s.stats.tov <= 3.2) >= 2
  ) {
    add("floor_general");
  }
  if (years((s) => s.stats.stl + s.stats.blk >= 2.4) >= 2) add("lockdown");
  if (
    (player.position === "C" || player.position === "PF") &&
    years((s) => s.stats.blk >= 1.7) >= 2
  ) {
    add("rim_protector");
  }
  if (last.role === "sixth_man" && last.stats.pts >= 15) add("microwave");
  if (last.playoff === "champ" || last.awards.includes("FMVP")) add("clutch");
  const sameClub = history.filter((s) => s.teamId === last.teamId).length;
  if (
    sameClub >= 4 &&
    player.reputation >= 58 &&
    (last.role === "star" || last.role === "franchise") &&
    (prev?.role === "star" || prev?.role === "franchise")
  ) {
    add("franchise_player");
  }

  return [...have];
}
