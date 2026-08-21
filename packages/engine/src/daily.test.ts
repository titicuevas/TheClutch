import { describe, expect, it } from "vitest";
import {
  CONTENT_VERSION,
  calculateLegacy,
  createCareer,
  dailyIsoDate,
  dailyPlayerSeed,
  encodeChallengeCode,
  formatLegacyCard,
  nextDailyResetUtc,
  parseChallengeCode,
} from "./index";

const DATE = "2026-08-21";

describe("Daily y Challenge", () => {
  it("la misma fecha UTC produce el mismo jugador; el runSeed no", () => {
    const playerSeed = dailyPlayerSeed(DATE);
    const a = createCareer({ playerSeed, runSeed: "run-a", mode: "daily", dailyDate: DATE });
    const b = createCareer({ playerSeed, runSeed: "run-b", mode: "daily", dailyDate: DATE, position: "C" });
    expect(a.player.firstName).toBe(b.player.firstName);
    expect(a.player.lastName).toBe(b.player.lastName);
    expect(a.player.position).toBe(b.player.position);
    expect(a.player.nationality).toBe(b.player.nationality);
    expect(a.meta.mode).toBe("daily");
    expect(a.meta.challengeCode).toBe("BK1-D-260821");
    expect(a.meta.runSeed).not.toBe(b.meta.runSeed);
  });

  it("Daily ignora posición, país, mano y nombre (D-02)", () => {
    const playerSeed = dailyPlayerSeed(DATE);
    const natural = createCareer({ playerSeed, runSeed: "r", mode: "daily", dailyDate: DATE });
    const forced = createCareer({
      playerSeed,
      runSeed: "r",
      mode: "daily",
      dailyDate: DATE,
      position: "C",
      nationality: "ES",
      handed: "left",
      givenName: "Lola Ruiz",
    });
    const free = createCareer({ playerSeed, runSeed: "r", position: "C" });
    expect(forced.player.position).toBe(natural.player.position);
    expect(forced.player.nationality).toBe(natural.player.nationality);
    expect(forced.player.handed).toBe(natural.player.handed);
    expect(forced.player.firstName).toBe(natural.player.firstName);
    expect(free.player.position).toBe("C");
  });

  it("el código BK1-D redondea a la misma playerSeed", () => {
    const seed = dailyPlayerSeed(DATE, CONTENT_VERSION);
    expect(encodeChallengeCode(seed)).toBe("BK1-D-260821");
    expect(parseChallengeCode("bk1-d-260821")).toEqual({
      playerSeed: seed,
      dailyDate: DATE,
      contentVersion: CONTENT_VERSION,
    });
    expect(parseChallengeCode("BK1-D-260231")).toBeNull();
    expect(parseChallengeCode("NOPE")).toBeNull();
  });

  it("un Free con identidad se comparte y se vuelve a abrir igual", () => {
    const input = {
      playerSeed: "share-lola",
      runSeed: "run-a",
      position: "PG" as const,
      nationality: "ES",
      handed: "left" as const,
      givenName: "Lola Ruiz",
    };
    const origin = createCareer(input);
    const code = origin.meta.challengeCode;
    expect(code).toMatch(/^BK1-X-/);
    const parsed = parseChallengeCode(code!);
    expect(parsed).toMatchObject({
      playerSeed: "share-lola",
      position: "PG",
      nationality: "ES",
      handed: "left",
      givenName: "Lola Ruiz",
    });
    const copy = createCareer({
      playerSeed: parsed!.playerSeed,
      runSeed: "run-b",
      mode: "challenge",
      position: parsed!.position,
      nationality: parsed!.nationality,
      handed: parsed!.handed,
      givenName: parsed!.givenName,
    });
    expect(copy.player.firstName).toBe("Lola");
    expect(copy.player.lastName).toBe("Ruiz");
    expect(copy.player.position).toBe("PG");
    expect(copy.player.nationality).toBe("ES");
    expect(copy.player.handed).toBe("left");
    expect(copy.player.attributes).toEqual(origin.player.attributes);
    expect(copy.meta.challengeCode).toBe(code);
    expect(formatLegacyCard(calculateLegacy({ ...origin, retired: true }))).toContain(`Challenge ${code}`);
  });

  it("otra fecha es otro jugador", () => {
    const a = createCareer({
      playerSeed: dailyPlayerSeed("2026-08-21"),
      runSeed: "r",
      mode: "daily",
      dailyDate: "2026-08-21",
    });
    const b = createCareer({
      playerSeed: dailyPlayerSeed("2026-08-22"),
      runSeed: "r",
      mode: "daily",
      dailyDate: "2026-08-22",
    });
    expect(a.player).not.toEqual(b.player);
    expect(a.meta.playerSeed).not.toBe(b.meta.playerSeed);
  });

  it("la ficha copiada lleva Daily y el código, no un percentil", () => {
    const state = createCareer({
      playerSeed: dailyPlayerSeed(DATE),
      runSeed: "share",
      mode: "daily",
      dailyDate: DATE,
    });
    const retired = { ...state, retired: true as const };
    const report = calculateLegacy(retired);
    const card = formatLegacyCard(report);
    expect(card).toContain("Daily 2026-08-21 · BK1-D-260821");
    expect(card).not.toContain("Top ");
    expect(report.mode).toBe("daily");
  });

  it("dailyIsoDate y el reset son UTC", () => {
    const now = new Date("2026-08-21T23:30:00.000Z");
    expect(dailyIsoDate(now)).toBe("2026-08-21");
    expect(nextDailyResetUtc(now).toISOString()).toBe("2026-08-22T00:00:00.000Z");
    const nextDay = new Date("2026-08-22T00:00:00.000Z");
    expect(dailyIsoDate(nextDay)).toBe("2026-08-22");
  });
});
