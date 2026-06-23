import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}
export function PromotionHeader({ title, subtitle, actions }: Props) {
  return (
    <header className="promo-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {actions}
    </header>
  );
}
