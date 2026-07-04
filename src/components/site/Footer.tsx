import { Instagram, Facebook, Twitter, Youtube, MapPin, Phone, Mail, Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Logo } from "@/components/site/Logo";


type FooterLink = { label: string; to?: string; hash?: string; soon?: boolean };

const COLS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Menu",
    links: [
      { label: "Zinger Burgers", to: "/menu", hash: "burgers" },
      { label: "Beef Burgers", to: "/menu", hash: "burgers" },
      { label: "Shawarma & Wraps", to: "/menu", hash: "shawarma" },
      { label: "Paratha Rolls", to: "/menu", hash: "rolls" },
      { label: "Family Platters", to: "/menu", hash: "platters" },
      { label: "Broast & Wings", to: "/menu", hash: "broast" },
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
      { label: "Blog", soon: true },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help center", soon: true },
      { label: "Order tracking", soon: true },
      { label: "Returns", soon: true },
      { label: "Privacy", soon: true },
      { label: "Terms", soon: true },
      { label: "Contact", hash: "contact" },
    ],
  },
];

const SOCIALS = [
  { Icon: Instagram, label: "Instagram" },
  { Icon: Facebook, label: "Facebook" },
  { Icon: Twitter, label: "Twitter" },
  { Icon: Youtube, label: "YouTube" },
];

function soonToast(label: string) {
  toast(`${label} — coming soon`, { description: "We're building this section next." });
}

function FooterLinkEl({ link }: { link: FooterLink }) {
  const cls = "text-sm text-white/80 hover:text-primary transition-colors";
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
    <footer id="contact" className="bg-secondary text-secondary-foreground pt-20 pb-8 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="container-dz">
        <div className="grid lg:grid-cols-[1.4fr_2fr_1.2fr] gap-12 pb-12 border-b border-white/10">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2.5 mb-5 group">
              <div className="h-11 w-11 rounded-xl bg-brand-black grid place-items-center overflow-hidden shadow-[var(--shadow-glow)] group-hover:scale-105 transition-transform">
                <Logo className="h-9 w-9 object-contain" />
              </div>
              <div className="font-display text-xl font-extrabold">Daddy Zinger</div>
            </Link>
            <p className="text-white/60 text-sm leading-relaxed max-w-sm">
              Premium Pakistani fast-food. Fresh chicken, house sauces, and delivery you can set your watch to.
            </p>
            <div className="mt-6 flex gap-2">
              {SOCIALS.map(({ Icon, label }) => (
                <button
                  key={label}
                  onClick={() => soonToast(label)}
                  aria-label={label}
                  className="h-10 w-10 rounded-full bg-white/5 border border-white/10 grid place-items-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Nav cols */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {COLS.map((col) => (
              <div key={col.title}>
                <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">{col.title}</div>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <FooterLinkEl link={l} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Contact + Hours */}
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/40">Reach us</div>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-white/80">Zamzama Boulevard, DHA Phase 5, Karachi</span>
              </div>
              <a href="tel:+923000000000" className="flex items-center gap-3 hover:text-primary transition-colors">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <span className="text-white/80">+92 300 DADDY-Z</span>
              </a>
              <a href="mailto:hello@daddyzinger.pk" className="flex items-center gap-3 hover:text-primary transition-colors">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <span className="text-white/80">hello@daddyzinger.pk</span>
              </a>
              <div className="flex items-start gap-3 pt-2">
                <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="text-white/80">
                  <div>Mon – Sun</div>
                  <div className="text-white/60">11:00 AM – 3:00 AM</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <div>© {new Date().getFullYear()} Daddy Zinger. Crafted with fire.</div>
          <div className="flex gap-6">
            <button className="hover:text-white" onClick={() => soonToast("Privacy")}>Privacy</button>
            <button className="hover:text-white" onClick={() => soonToast("Terms")}>Terms</button>
            <button className="hover:text-white" onClick={() => soonToast("Cookies")}>Cookies</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

// keep the import used
export type { MenuCategory };
