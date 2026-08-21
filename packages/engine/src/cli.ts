import {
  createCareer,
  dispatch,
  formatLegacyCard,
  calculateLegacy,
  getViewModel,
} from "./index";
import { formatBalanceReport, runBalanceBatch } from "./balance/batch";

function arg(flag: string, fallback: string): string {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1]!;
  return fallback;
}

if (process.argv.includes("--batch")) {
  const n = Math.max(1, Number(arg("--n", "400")) || 400);
  const prefix = arg("--prefix", "batch");
  console.log(formatBalanceReport(runBalanceBatch(n, prefix)));
  process.exit(0);
}

const playerSeed = arg("--seed", `free:${Date.now()}`);
const runSeed = arg("--run", playerSeed);

let state = createCareer({ playerSeed, runSeed });
const intro = getViewModel(state);

console.log("THECLUTCH · career sim");
console.log("======================");
console.log(
  `${intro.name}  ${intro.position} ${intro.archetype}  ${intro.heightCm}cm  ${intro.nationality}`,
);
console.log(`OVR ${intro.overall} · ${intro.role} · ${intro.teamName}`);
console.log(`Scout: ${intro.potentialBand}`);
console.log(`seeds  player=${playerSeed}  run=${runSeed}`);
console.log("");

while (!state.retired) {
  if (state.awaitingRecap) {
    state = dispatch(state, { type: "SIMULATE_NEXT" }).state;
    continue;
  }
  if (state.pendingDecision) {
    const choice = state.pendingDecision.options[0]!;
    console.log(`  → ${state.pendingDecision.title}: ${choice.label}`);
    const before = state.history.length;
    state = dispatch(state, { type: "CHOOSE", optionId: choice.id }).state;
    if (!state.pendingDecision && state.history.length > before) {
      printSeason(state.history.at(-1)!);
    }
    continue;
  }

  const result = dispatch(state, { type: "SIMULATE_NEXT" });
  state = result.state;
  if (state.pendingDecision) continue;

  const season = getViewModel(state).lastSeason;
  if (season && result.log.some((line) => line.startsWith("Season"))) {
    printSeason(season);
  }
}

console.log("");
console.log(formatLegacyCard(calculateLegacy(state)));

function printSeason(season: NonNullable<ReturnType<typeof getViewModel>["lastSeason"]>): void {
  const inj = season.injury ? `  [${season.injury.severity} ${season.injury.type}]` : "";
  const extra = [season.playoff, ...season.awards, ...season.titles].join(" ");
  const nt = season.national
    ? `  NT:${season.national.status}${season.national.result ? `/${season.national.result}` : ""}${season.national.foe ? ` vs ${season.national.foe}` : ""}`
    : "";
  console.log(
    `Y${season.year}  age ${season.age}  OVR ${season.overall}  ${season.role.padEnd(10)}  ` +
      `${season.stats.pts.toFixed(1)}/${season.stats.ast.toFixed(1)}/${season.stats.reb.toFixed(1)}  ` +
      `${season.stats.games}g${inj}${extra ? `  ${extra}` : ""}${nt}`,
  );
}
