export type CrestStyle = {
  primary: string;
  secondary: string;
  accent: string;
  mark: number;
  shield: number;
  initials: string;
};

const PALETTES: [string, string, string][] = [
  ["#1d4ed8", "#f8fafc", "#fbbf24"],
  ["#b91c1c", "#111827", "#f8fafc"],
  ["#0f766e", "#042f2e", "#fbbf24"],
  ["#7c3aed", "#1e1b4b", "#e9d5ff"],
  ["#c2410c", "#1c1917", "#fed7aa"],
  ["#0369a1", "#0c4a6e", "#7dd3fc"],
  ["#166534", "#052e16", "#bbf7d0"],
  ["#9f1239", "#4c0519", "#fecdd3"],
  ["#1e3a5f", "#e8b84a", "#f4ead6"],
  ["#3f3f46", "#e4e4e7", "#e23d2d"],
  ["#7f1d1d", "#fef3c7", "#b45309"],
  ["#312e81", "#e0e7ff", "#f43f5e"],
];

export function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function initialsFromName(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function crestStyle(teamId: string, teamName: string): CrestStyle {
  const h = hash32(teamId);
  const [primary, secondary, accent] = PALETTES[h % PALETTES.length]!;
  return {
    primary,
    secondary,
    accent,
    mark: h % 5,
    shield: (h >>> 8) % 4,
    initials: initialsFromName(teamName),
  };
}

export function jerseyNumber(seed: string): number {
  return (hash32(seed) % 99) + 1;
}

export const FLAG: Record<string, string> = {
  ES: "🇪🇸",
  FR: "🇫🇷",
  US: "🇺🇸",
  RS: "🇷🇸",
  AR: "🇦🇷",
  LT: "🇱🇹",
  GR: "🇬🇷",
  DE: "🇩🇪",
};

export function teamForOption(
  optionId: string,
  data?: {
    stayTeam?: { id: string; name: string };
    leaveTeam?: { id: string; name: string };
    ringTeam?: { id: string; name: string };
  },
): { id: string; name: string } | null {
  if (!data) return null;
  if (optionId === "stay" || optionId === "fight" || optionId === "club") return data.stayTeam ?? null;
  if (optionId === "leave" || optionId === "go" || optionId === "accept" || optionId === "college") {
    return data.leaveTeam ?? null;
  }
  if (optionId === "ring") return data.ringTeam ?? null;
  return null;
}
