import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; to?: string };

export function PageHeader({
  title,
  description,
  eyebrow,
  crumbs,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
            {crumbs.map((c, i) => (
              <React.Fragment key={`${c.label}-${i}`}>
                {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
                {c.to ? (
                  <Link to={c.to} className="rounded px-1 py-0.5 hover:bg-muted hover:text-foreground">
                    {c.label}
                  </Link>
                ) : (
                  <span className="px-1 py-0.5 text-foreground/80">{c.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        {eyebrow && (
          <div className="mb-1.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="truncate font-display text-2xl font-black tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
