import { Instagram, Facebook, MapPin, Phone, Clock, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Logo } from "@/components/site/Logo";

type FooterLink = { label: string; to?: string; hash?: string; soon?: boolean };

const COLS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Menu",
    links: [
      { label: "Zinger Burgers", to: "/menu", hash: "burgers" },
      { label: "Shawarma & Wraps", to: "/menu", hash: "shawarma" },
      { label: "Paratha Rolls", to: "/menu", hash: "rolls" },
      { label: "Family Platters", to: "/menu", hash: "platters" },
      { label: "Broast & Wings", to: "/menu", hash: "broast" },
      { label: "Sides & Loaded Fries", to: "/menu", hash: "sides" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", hash: "why" },
      { label: "Our story", soon: true },
      { label: "Careers", soon: true },
      { label: "Franchise", soon: true },
      { label: "Press", soon: true },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help center", soon: true },
      { label: "Order tracking", soon: true },
      { label: "Privacy", soon: true },
      { label: "Terms", soon: true },
      { label: "Contact", hash: "contact" },
    ],
  },
];

// Simple TikTok glyph (lucide has no tiktok)
function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M19.6 6.7a5.6 5.6 0 0 1-3.4-1.2 5.6 5.6 0 0 1-2.2-3.5h-3v13.4a2.7 2.7 0 1 1-2.7-2.7c.3 0 .5 0 .8.1V9.7a5.9 5.9 0 0 0-.8 0 5.8 5.8 0 1 0 5.8 5.8V9.2a8.6 8.6 0 0 0 5.5 1.9V8.2a5.4 5.4 0 0 1 0-1.5Z" />
    </svg>
  );
}

const SOCIALS: { label: string; href: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { label: "Facebook", href: "https://facebook.com/daddyzinger", Icon: Facebook },
  { label: "Instagram", href: "https://instagram.com/daddyzinger", Icon: Instagram },
  { label: "TikTok", href: "https://tiktok.com/@daddyzinger", Icon: TikTokIcon },
];

const BRANCHES = [
  { name: "Branch 1", address: ["Old Hospital Chowk,", "Near Ghori House,", "Lodhran"] },
  { name: "Branch 2", address: ["Fateh Chowk,", "Model Town B,", "Bahawalpur"] },
];

function soonToast(label: string) {
  toast(`${label} — coming soon`, { description: "We're building this section next." });
}

function FooterLinkEl({ link }: { link: FooterLink }) {
  const cls = "text-sm text-white/75 hover:text-primary transition-colors";
  if (link.to) {
    return (
      <Link to={link.to} hash={link.hash} className={cls}>
        {link.label}
      </Link>
    );
  }
  if (link.hash && !link.soon) {
    return (
      <a href={`/#${link.hash}`} className={cls}>
        {link.label}
      </a>
    );
  }
  return (
    <button type="button" onClick={() => soonToast(link.label)} className={`${cls} text-left`}>
      {link.label}
    </button>
  );
}

export function Footer() {
  return (
    <footer id="contact" className="bg-secondary text-secondary-foreground pt-14 md:pt-20 pb-8 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="container-dz relative">
        {/* Top: brand + branches highlight */}
        <div className="grid gap-8 md:gap-10 lg:grid-cols-[1.2fr_1fr] pb-10 md:pb-12 border-b border-white/10">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 mb-5 group" aria-label="Daddy Zinger — Home">
              <div className="h-16 w-16 rounded-2xl overflow-hidden ring-1 ring-primary/30 shadow-[var(--shadow-glow)] group-hover:scale-[1.04] transition-transform">
                <Logo className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="font-display text-2xl font-extrabold tracking-tight">Daddy Zinger</div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">Choice of the family</div>
              </div>
            </Link>
            <p className="text-white/65 text-sm md:text-base leading-relaxed max-w-md">
              Premium Pakistani fast-food from the heart of South Punjab. Fresh chicken, house sauces, and orders you can set your watch to.
            </p>
            <div className="mt-6 flex gap-2.5">
              {SOCIALS.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="h-11 w-11 rounded-full bg-white/5 border border-white/10 grid place-items-center hover:bg-primary hover:text-primary-foreground hover:border-primary hover:-translate-y-0.5 transition-all"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {BRANCHES.map((b) => (
              <div key={b.name} className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/[0.07] hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-primary font-bold mb-2">
                  <MapPin className="h-3.5 w-3.5" /> {b.name}
                </div>
                <div className="text-sm text-white/85 leading-relaxed">
                  {b.address.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: nav + contact */}
        <div className="grid gap-10 md:gap-12 md:grid-cols-2 lg:grid-cols-[2fr_1.1fr] py-12 border-b border-white/10">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            {COLS.map((col) => (
              <div key={col.title}>
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/45 mb-4 font-semibold">
                  {col.title}
                </div>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <FooterLinkEl link={l} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/45 mb-4 font-semibold">
              Reach us
            </div>
            <div className="space-y-4 text-sm">
              <a
                href="tel:+923393424042"
                className="flex items-center gap-3 group rounded-xl px-3 py-2.5 -mx-3 hover:bg-white/5 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Phone · Order now</div>
                  <div className="text-white font-semibold">0339-3424042</div>
                </div>
              </a>
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 -mx-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Opening hours</div>
                  <div className="text-white font-semibold">11:00 AM – 11:00 PM</div>
                  <div className="text-xs text-white/50">Open every day</div>
                </div>
              </div>
              <a
                href="https://www.google.com/maps/search/Daddy+Zinger+Lodhran"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                Get directions <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* App download */}
        <div className="py-8 border-b border-white/10 grid gap-6 md:grid-cols-[1fr_auto] items-center">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-primary font-bold mb-2">Get the app</div>
            <div className="font-display text-xl md:text-2xl font-extrabold leading-tight">
              Order faster. Track live. Earn Zinger rewards.
            </div>
            <p className="text-white/60 text-sm mt-1">Coming soon to the App Store and Google Play.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => soonToast("iOS app")}
              className="inline-flex items-center gap-2 h-12 px-5 rounded-2xl bg-white text-brand-black hover:bg-white/90 transition-colors font-semibold text-sm"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden><path d="M16.365 12.75c-.02-2.06 1.68-3.05 1.76-3.1-.96-1.4-2.45-1.59-2.98-1.61-1.27-.13-2.48.75-3.13.75-.65 0-1.65-.73-2.72-.71-1.4.02-2.7.82-3.42 2.07-1.46 2.54-.37 6.29 1.05 8.35.69 1.01 1.51 2.14 2.58 2.1 1.04-.04 1.43-.67 2.68-.67 1.25 0 1.6.67 2.7.65 1.12-.02 1.83-1.03 2.51-2.05.79-1.17 1.11-2.32 1.13-2.38-.02-.01-2.16-.83-2.18-3.4zm-2.05-6.24c.57-.7.96-1.66.85-2.62-.83.03-1.83.55-2.42 1.24-.53.61-1 1.6-.88 2.53.92.07 1.87-.47 2.45-1.15z"/></svg>
              <div className="text-left leading-tight">
                <div className="text-[9px] uppercase tracking-wider opacity-70">Download on the</div>
                <div className="font-display font-extrabold">App Store</div>
              </div>
            </button>
            <button
              onClick={() => soonToast("Android app")}
              className="inline-flex items-center gap-2 h-12 px-5 rounded-2xl bg-white text-brand-black hover:bg-white/90 transition-colors font-semibold text-sm"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden><path d="M3.61 1.81a1.5 1.5 0 0 0-.61 1.2v18a1.5 1.5 0 0 0 .6 1.2l10.7-10.4L3.6 1.8zm12.2 11.8l3.1 1.8c1 .58 1 2.02 0 2.6l-3.1 1.8-3.3-3.1 3.3-3.1zm-1.4-1.3l-10.6 10.4c.2.03.42-.01.6-.12l12.6-7.29-2.6-2.99zM4.4 1.7c-.19-.11-.4-.15-.6-.12l10.6 10.4 2.6-3L4.4 1.7z"/></svg>
              <div className="text-left leading-tight">
                <div className="text-[9px] uppercase tracking-wider opacity-70">Get it on</div>
                <div className="font-display font-extrabold">Google Play</div>
              </div>
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/45">
          <div>© {new Date().getFullYear()} Daddy Zinger. Crafted with fire in Lodhran &amp; Bahawalpur.</div>
          <div className="flex gap-6">
            <button className="hover:text-white transition-colors" onClick={() => soonToast("Privacy")}>Privacy</button>
            <button className="hover:text-white transition-colors" onClick={() => soonToast("Terms")}>Terms</button>
            <button className="hover:text-white transition-colors" onClick={() => soonToast("Cookies")}>Cookies</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
