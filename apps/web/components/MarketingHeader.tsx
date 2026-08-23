import { Breadcrumbs } from "./Breadcrumbs";

type Props = {
  current: string;
  eyebrow: string;
  title: string;
  description?: string;
};

export function MarketingHeader({ current, eyebrow, title, description }: Props) {
  return (
    <header>
      <Breadcrumbs current={current} />
      <p className="text-xs uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
      <h1 className="font-display mt-2 text-4xl">{title}</h1>
      {description ? <p className="mt-4 text-sm leading-relaxed text-mute">{description}</p> : null}
    </header>
  );
}
