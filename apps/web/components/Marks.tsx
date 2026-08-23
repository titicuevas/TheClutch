type IconProps = { className?: string };

export function TitleMark({ id, className }: { id: string } & IconProps) {
  const cls = `shrink-0 fill-current ${className ?? ""}`;
  if (id === "Continental") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden className={cls}>
        <path d="M12 3 14.2 8.2 20 9l-4.2 3.8L16.8 18 12 15.4 7.2 18l1-5.2L4 9l5.8-.8Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className={cls}>
      <path d="M6 3h12v2l-1 4c0 3.3-2.2 6-5 6s-5-2.7-5-6L6 5V3zm6 14v4m-4 0h8M8 21h8" />
    </svg>
  );
}

export function TitleLine({ titles, text }: { titles: string[]; text: string }) {
  if (!titles.length || !text) return null;
  const unique = [...new Set(titles)];
  return (
    <span className="inline-flex items-center gap-1 text-good">
      {unique.map((id) => (
        <TitleMark key={id} id={id} />
      ))}
      <span>{text}</span>
    </span>
  );
}

export function ChampMark({ className }: IconProps) {
  return <TitleMark id="League" className={className} />;
}

export function AwardMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden className={`shrink-0 fill-current ${className ?? ""}`}>
      <path d="M12 2 14.5 8.5 21 9.5 16 14l1.5 6.5L12 17l-5.5 3.5L8 14 3 9.5l6.5-1z" />
    </svg>
  );
}

export function ClutchOutcomeMark({
  tone,
  testId = "clutch-outcome",
}: {
  tone: "good" | "bad" | "neutral";
  testId?: string;
}) {
  const label = tone === "good" ? "Dentro" : tone === "bad" ? "Fuera" : "Sistema";
  const color = tone === "good" ? "text-good" : tone === "bad" ? "text-clutch" : "text-gold";
  return (
    <span data-testid={testId} className={`block text-xs font-semibold uppercase tracking-widest ${color}`}>
      Momento clutch · {label}
    </span>
  );
}
