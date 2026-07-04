import { createFileRoute } from "@tanstack/react-router";
import { Flame, ShoppingBag, Truck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  component: Foundation,
});

const NEUTRALS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

function Swatch({ name, className, fg = "text-foreground" }: { name: string; className: string; fg?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`h-20 rounded-lg border border-border ${className}`} />
      <div className={`text-xs font-medium ${fg}`}>{name}</div>
    </div>
  );
}

function Section({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section className="py-16 md:py-20 border-b border-border">
      <div className="container-dz">
        <div className="mb-8 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{kicker}</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h2>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function Foundation() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Hero — brand statement */}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "var(--gradient-radial-glow)" }}
          aria-hidden
        />
        <div className="container-dz pt-10 md:pt-16 pb-20 md:pb-28">
          <nav className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary grid place-items-center shadow-[var(--shadow-glow)]">
                <Flame className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">Daddy Zinger</span>
            </div>
            <Badge className="bg-secondary text-secondary-foreground">Design System v1</Badge>
          </nav>

          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-5 border-border">
              <Sparkles className="h-3 w-3 mr-1.5" /> Foundation
            </Badge>
            <h1 className="text-display">
              Bold flavor,{" "}
              <span className="text-gradient-brand">crafted premium.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              The Daddy Zinger design system — tokens, typography, elevation and components that power
              every screen. Built to feel like a global restaurant brand.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-3)]">
                <ShoppingBag className="h-4 w-4" /> Explore tokens
              </Button>
              <Button size="lg" variant="outline">
                <Truck className="h-4 w-4" /> View components
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Colors */}
      <Section kicker="01 — Color" title="Brand & semantic palette">
        <div className="grid gap-8">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Brand</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Swatch name="Yellow" className="bg-primary" />
              <Swatch name="Yellow soft" className="bg-[var(--color-brand-yellow-soft)]" />
              <Swatch name="Black" className="bg-secondary" />
              <Swatch name="Charcoal" className="bg-[var(--color-brand-charcoal)]" />
              <Swatch name="Spice red" className="bg-[var(--color-brand-red)]" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Neutrals</h3>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
              {NEUTRALS.map((n) => (
                <Swatch key={n} name={String(n)} className={`bg-[var(--color-neutral-${n})]`} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Semantic</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Swatch name="Success" className="bg-success" />
              <Swatch name="Warning" className="bg-warning" />
              <Swatch name="Danger" className="bg-destructive" />
              <Swatch name="Info" className="bg-info" />
            </div>
          </div>
        </div>
      </Section>

      {/* Typography */}
      <Section kicker="02 — Typography" title="Bricolage Grotesque × Inter">
        <div className="space-y-6">
          <div className="text-display">Zinger. Loaded. Legendary.</div>
          <h1 className="text-5xl">H1 — Premium fast food</h1>
          <h2 className="text-4xl">H2 — Section headline</h2>
          <h3 className="text-3xl">H3 — Category title</h3>
          <h4 className="text-2xl">H4 — Card title</h4>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Body large — crisp, warm, unmistakably ours. Reads beautifully on desktop and mobile,
            with tight tracking and confident rhythm.
          </p>
          <p className="max-w-2xl">Body — standard paragraph text for descriptions and details.</p>
          <p className="text-sm text-muted-foreground">Small — helper and metadata copy.</p>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Caption / Label</p>
        </div>
      </Section>

      {/* Elevation */}
      <Section kicker="03 — Elevation" title="Shadow system">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((l) => (
            <div
              key={l}
              className="h-28 rounded-xl bg-card grid place-items-center text-sm font-medium"
              style={{ boxShadow: `var(--shadow-${l})` }}
            >
              Level {l}
            </div>
          ))}
        </div>
      </Section>

      {/* Radius & Spacing */}
      <Section kicker="04 — Shape" title="Radius & spacing">
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Radius</h3>
            <div className="flex flex-wrap gap-4">
              {[
                ["sm", "rounded-sm"],
                ["md", "rounded-md"],
                ["lg", "rounded-lg"],
                ["xl", "rounded-xl"],
                ["2xl", "rounded-2xl"],
                ["pill", "rounded-full"],
              ].map(([name, cls]) => (
                <div key={name} className="flex flex-col items-center gap-2">
                  <div className={`h-16 w-16 bg-primary ${cls}`} />
                  <span className="text-xs text-muted-foreground">{name}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Spacing (8-pt)</h3>
            <div className="space-y-2">
              {[4, 8, 16, 24, 32, 48, 64, 96].map((s) => (
                <div key={s} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8 tabular-nums">{s}</span>
                  <div className="h-2 bg-secondary rounded-full" style={{ width: `${s * 2}px` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Buttons */}
      <Section kicker="05 — Buttons" title="Interaction primitives">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Danger</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      {/* Inputs & Cards */}
      <Section kicker="06 — Forms & Cards" title="Content containers">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Input placeholder="Search the menu…" />
            <Input placeholder="Your phone number" />
            <Input placeholder="Coupon code" />
          </div>
          <Card className="shadow-[var(--shadow-3)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
            <CardHeader>
              <CardTitle>Signature Zinger</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sample card — crisp buttermilk chicken, brioche bun, secret sauce. Design tokens applied.
            </CardContent>
          </Card>
        </div>
      </Section>

      <footer className="py-10">
        <div className="container-dz flex items-center justify-between text-xs text-muted-foreground">
          <span>© Daddy Zinger — Design foundation</span>
          <span>Built with intent.</span>
        </div>
      </footer>
    </div>
  );
}
