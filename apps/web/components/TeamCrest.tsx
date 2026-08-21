"use client";

import { crestStyle } from "../lib/crest";

type Props = {
  teamId: string;
  teamName: string;
  size?: number;
};

export function TeamCrest({ teamId, teamName, size = 40 }: Props) {
  const { primary, secondary, accent, mark, shield, initials } = crestStyle(teamId, teamName);
  const id = `${teamId}-${size}`.replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="shrink-0 drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]"
    >
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={primary} />
          <stop offset="100%" stopColor={secondary} />
        </linearGradient>
      </defs>
      <Shield shape={shield} fill={`url(#g-${id})`} stroke={accent} />
      <LocalMark mark={mark} accent={accent} secondary={secondary} />
      <text
        x="32"
        y="54"
        textAnchor="middle"
        fill={accent}
        fontSize="9"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        {initials}
      </text>
    </svg>
  );
}

function Shield({ shape, fill, stroke }: { shape: number; fill: string; stroke: string }) {
  if (shape === 1) {
    return <circle cx="32" cy="32" r="28" fill={fill} stroke={stroke} strokeWidth="2" />;
  }
  if (shape === 2) {
    return (
      <path
        d="M8 18 H56 V38 C56 50 44 58 32 60 C20 58 8 50 8 38 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
      />
    );
  }
  if (shape === 3) {
    return (
      <path
        d="M12 10 H52 L58 22 L32 60 L6 22 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
      />
    );
  }
  return (
    <path
      d="M32 4 L56 14 V34 C56 48 44 56 32 60 C20 56 8 48 8 34 V14 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth="2"
    />
  );
}

function LocalMark({
  mark,
  accent,
  secondary,
}: {
  mark: number;
  accent: string;
  secondary: string;
}) {
  if (mark === 0) {
    return (
      <>
        <circle cx="32" cy="28" r="11" fill="none" stroke={accent} strokeWidth="2" />
        <path
          d="M21 28h22 M32 17v22 M23 22c6 8 12 8 18 0 M23 34c6-8 12-8 18 0"
          fill="none"
          stroke={accent}
          strokeWidth="1.5"
        />
      </>
    );
  }
  if (mark === 1) return <path d="M20 36 L32 14 L44 36 H36 L32 26 L28 36 Z" fill={accent} />;
  if (mark === 2) {
    return (
      <>
        <rect x="22" y="14" width="5" height="28" fill={accent} />
        <rect x="30" y="14" width="5" height="28" fill={secondary} opacity="0.85" />
        <rect x="38" y="14" width="5" height="28" fill={accent} />
      </>
    );
  }
  if (mark === 3) {
    return <path d="M32 14 L35 24 H46 L37 30 L40 41 L32 34 L24 41 L27 30 L18 24 H29 Z" fill={accent} />;
  }
  return (
    <path
      d="M18 26 C28 16 36 16 46 26 C36 24 28 24 18 26 M18 32 C28 42 36 42 46 32 C36 34 28 34 18 32"
      fill={accent}
    />
  );
}
