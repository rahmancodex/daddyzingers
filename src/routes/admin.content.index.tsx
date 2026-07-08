import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { CMS_MODULES } from "@/lib/cms-shared";

export const Route = createFileRoute("/admin/content/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Content Management — Admin · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <ContentIndex />
    </AdminShell>
  ),
});

function ContentIndex() {
  const modules = Object.values(CMS_MODULES);
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-24">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Content Management
        </div>
        <h1 className="font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl">
          Website Content
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Manage every editable module that powers the customer website. All changes
          respect draft, scheduled, and published lifecycles.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link key={m.module} to={m.route} className="group">
            <Card className="h-full rounded-2xl border-border/70 transition-colors hover:border-primary/40 hover:shadow-md">
              <CardContent className="flex h-full flex-col justify-between gap-3 p-5">
                <div className="space-y-1.5">
                  <div className="text-base font-bold">{m.label}</div>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-primary opacity-70 transition-opacity group-hover:opacity-100">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
