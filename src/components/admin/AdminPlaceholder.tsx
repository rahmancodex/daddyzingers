import * as React from "react";
import { Construction } from "lucide-react";

export function AdminPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center shadow-[var(--shadow-1)]">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15">
          <Construction className="h-6 w-6 text-foreground" />
        </div>
        <h2 className="mt-4 font-display text-xl font-black">Coming soon</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          This module is part of the admin foundation. Full CRUD, filters and analytics for{" "}
          <span className="font-semibold text-foreground">{title.toLowerCase()}</span> will be wired
          up in the next sprint.
        </p>
      </div>
    </div>
  );
}
