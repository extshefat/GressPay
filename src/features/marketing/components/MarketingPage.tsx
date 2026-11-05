import * as React from "react";
import { Container, Section, SectionHeader } from "@/components/ui";

export function MarketingPage({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`min-w-0 ${className}`}>{children}</div>;
}

export function MarketingBand({
  children,
  className = "",
  id,
  bordered = true,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  bordered?: boolean;
}) {
  return (
    <Section
      id={id}
      className={`${bordered ? "border-b border-border" : ""} ${className}`}
    >
      <Container>{children}</Container>
    </Section>
  );
}

export function MarketingHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <SectionHeader
      kicker={kicker}
      title={<span className="gp-display text-3xl sm:text-4xl">{title}</span>}
      description={description}
      actions={actions}
    />
  );
}
