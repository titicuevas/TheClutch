import type { ClubStint, SeasonRecord } from "./types";

export function collectClubStints(history: SeasonRecord[]): ClubStint[] {
  const stints: ClubStint[] = [];
  for (const season of history) {
    const current = stints.at(-1);
    if (current && current.teamId === season.teamId) {
      current.seasons += 1;
      current.toYear = season.year;
      current.pts += season.stats.pts;
      current.ast += season.stats.ast;
      current.reb += season.stats.reb;
      current.blk += season.stats.blk;
      current.titles.push(...season.titles);
    } else {
      stints.push({
        teamId: season.teamId,
        teamName: season.teamName,
        seasons: 1,
        fromYear: season.year,
        toYear: season.year,
        pts: season.stats.pts,
        ast: season.stats.ast,
        reb: season.stats.reb,
        blk: season.stats.blk,
        titles: [...season.titles],
      });
    }
  }
  return stints.map((stint) => ({
    ...stint,
    pts: round1(stint.pts / stint.seasons),
    ast: round1(stint.ast / stint.seasons),
    reb: round1(stint.reb / stint.seasons),
    blk: round1(stint.blk / stint.seasons),
  }));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
