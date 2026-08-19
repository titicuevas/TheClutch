import {
  createCareer,
  dispatch,
  formatLegacyCard,
  calculateLegacy,
  getViewModel,
} from "./index";

function arg(flag: string, fallback: string): string {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1]!;
  return fallback;
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
  const year = state.world.year;
  const result = dispatch(state, { type: "SIMULATE_NEXT" });
  state = result.state;
  const vm = getViewModel(state);
  const season = vm.lastSeason;
  if (season && result.log[0]?.startsWith("Season")) {
    const inj = season.injury ? `  [${season.injury.severity} ${season.injury.type}]` : "";
    const extra = [...season.awards, ...season.titles].join(" ");
    console.log(
      `Y${year}  age ${season.age}  OVR ${season.overall}  ${season.role.padEnd(10)}  ` +
        `${season.stats.pts.toFixed(1)}/${season.stats.ast.toFixed(1)}/${season.stats.reb.toFixed(1)}  ` +
        `${season.stats.games}g${inj}${extra ? `  ${extra}` : ""}`,
    );
  }
}

if (!state.retired) {
  state = dispatch(state, { type: "RETIRE" }).state;
}

console.log("");
console.log(formatLegacyCard(calculateLegacy(state)));
