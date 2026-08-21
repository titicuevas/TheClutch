/** Daily y Challenge: seeds compartidas. Ranking oficial → servidor (D-12). */

import type { Handed, Position } from "./state/types";

export const CONTENT_VERSION = "1";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAILY_SEED = /^theclutch:daily:(\d{4}-\d{2}-\d{2}):(.+)$/;
const CHALLENGE_DAILY = /^BK(\d+)-D-(\d{6})$/;
const CHALLENGE_CARD = /^BK(\d+)-X-([0-9A-HJKMNP-TV-Z-]+)$/;
const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];
const HANDS: Handed[] = ["left", "right"];
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const SEP = "\u001f";

export type ChallengeIdentity = {
  position?: Position;
  nationality?: string;
  handed?: Handed;
  givenName?: string;
};

export type ChallengeParse = {
  playerSeed: string;
  contentVersion: string;
  dailyDate?: string;
} & ChallengeIdentity;

export function dailyIsoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function dailyPlayerSeed(isoDate: string, contentVersion = CONTENT_VERSION): string {
  return `theclutch:daily:${isoDate}:${contentVersion}`;
}

export function nextDailyResetUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

export function isIsoDate(isoDate: string): boolean {
  return Boolean(parseIsoDate(isoDate));
}

export function encodeChallengeCode(playerSeed: string, identity?: ChallengeIdentity): string | null {
  const seed = playerSeed.trim();
  if (!seed || seed.includes(SEP) || seed.length > 80) return null;
  const daily = seed.match(DAILY_SEED);
  if (daily) {
    const iso = daily[1]!;
    const parsed = parseIsoDate(iso);
    if (!parsed) return null;
    const yy = String(parsed.y).slice(-2).padStart(2, "0");
    const mm = String(parsed.m).padStart(2, "0");
    const dd = String(parsed.d).padStart(2, "0");
    return `BK${daily[2]}-D-${yy}${mm}${dd}`;
  }
  const packed = packIdentity(seed, identity);
  const grouped = encodeBase32(encodeUtf8(packed)).match(/.{1,4}/g)?.join("-");
  if (!grouped) return null;
  return `BK${CONTENT_VERSION}-X-${grouped}`;
}

export function parseChallengeCode(code: string): ChallengeParse | null {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
  const daily = normalized.match(CHALLENGE_DAILY);
  if (daily) {
    const contentVersion = daily[1]!;
    const packed = daily[2]!;
    const iso = `20${packed.slice(0, 2)}-${packed.slice(2, 4)}-${packed.slice(4, 6)}`;
    if (!parseIsoDate(iso)) return null;
    return {
      playerSeed: dailyPlayerSeed(iso, contentVersion),
      dailyDate: iso,
      contentVersion,
    };
  }
  const card = normalized.match(CHALLENGE_CARD);
  if (!card) return null;
  const bytes = decodeBase32(card[2]!);
  if (!bytes) return null;
  const parts = decodeUtf8(bytes).split(SEP);
  if (parts.length !== 5) return null;
  const playerSeed = parts[0]!.trim();
  if (!playerSeed || playerSeed.length > 80) return null;
  const position = parsePos(parts[1]!);
  const nationality = parseNat(parts[2]!);
  const handed = parseHand(parts[3]!);
  const givenName = parts[4]!.trim().slice(0, 48) || undefined;
  if (parts[1] && !position) return null;
  if (parts[2] && !nationality) return null;
  if (parts[3] && !handed) return null;
  return {
    playerSeed,
    contentVersion: card[1]!,
    ...(position ? { position } : {}),
    ...(nationality ? { nationality } : {}),
    ...(handed ? { handed } : {}),
    ...(givenName ? { givenName } : {}),
  };
}

function packIdentity(seed: string, identity?: ChallengeIdentity): string {
  const name = (identity?.givenName ?? "").replaceAll(SEP, " ").trim().slice(0, 48);
  const nationality = (identity?.nationality ?? "").trim().toUpperCase();
  return [seed, identity?.position ?? "", nationality, identity?.handed ?? "", name].join(SEP);
}

function parsePos(value: string): Position | undefined {
  return POSITIONS.includes(value as Position) ? (value as Position) : undefined;
}

function parseNat(value: string): string | undefined {
  if (!/^[A-Z]{2}$/.test(value)) return undefined;
  return value;
}

function parseHand(value: string): Handed | undefined {
  const lower = value.toLowerCase();
  return HANDS.includes(lower as Handed) ? (lower as Handed) : undefined;
}

function parseIsoDate(isoDate: string): { y: number; m: number; d: number } | null {
  const match = ISO_DATE.exec(isoDate);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== m - 1 || utc.getUTCDate() !== d) return null;
  return { y, m, d };
}

function encodeBase32(data: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(value >>> bits) & 31];
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function decodeBase32(text: string): Uint8Array | null {
  const clean = text.replace(/-/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 255);
    }
  }
  return new Uint8Array(bytes);
}

function encodeUtf8(text: string): Uint8Array {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) {
      out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    }
  }
  return Uint8Array.from(out);
}

function decodeUtf8(bytes: Uint8Array): string {
  let i = 0;
  let out = "";
  while (i < bytes.length) {
    const b = bytes[i]!;
    if (b < 0x80) {
      out += String.fromCodePoint(b);
      i += 1;
    } else if ((b & 0xe0) === 0xc0 && i + 1 < bytes.length) {
      out += String.fromCodePoint(((b & 0x1f) << 6) | (bytes[i + 1]! & 0x3f));
      i += 2;
    } else if ((b & 0xf0) === 0xe0 && i + 2 < bytes.length) {
      out += String.fromCodePoint(
        ((b & 0x0f) << 12) | ((bytes[i + 1]! & 0x3f) << 6) | (bytes[i + 2]! & 0x3f),
      );
      i += 3;
    } else if ((b & 0xf8) === 0xf0 && i + 3 < bytes.length) {
      out += String.fromCodePoint(
        ((b & 0x07) << 18) |
          ((bytes[i + 1]! & 0x3f) << 12) |
          ((bytes[i + 2]! & 0x3f) << 6) |
          (bytes[i + 3]! & 0x3f),
      );
      i += 4;
    } else {
      return "";
    }
  }
  return out;
}
