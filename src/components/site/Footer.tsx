import { Instagram, Facebook, Twitter, Youtube, MapPin, Phone, Mail, Clock } from "lucide-react";
import { Logo } from "@/components/site/Logo";

const COLS = [
  {
    title: "Menu",
    links: ["Zinger Burgers", "Beef Burgers", "Shawarma & Wraps", "Fries & Sides", "Drinks", "Desserts"],
  },
  {
    title: "Company",
    links: ["About us", "Our story", "Careers", "Franchise", "Press", "Blog"],
  },
  {
    title: "Support",
    links: ["Help center", "Order tracking", "Returns", "Privacy", "Terms", "Contact"],
  },
];

export function Footer() {
  return (
    <footer id="contact" className="bg-secondary text-secondary-foreground pt-20 pb-8 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="container-dz">
        <div className="grid lg:grid-cols-[1.4fr_2fr_1.2fr] gap-12 pb-12 border-b border-white/10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="h-11 w-11 rounded-xl bg-brand-black grid place-items-center overflow-hidden shadow-[var(--shadow-glow)]">
                <Logo className="h-9 w-9 object-contain" />
              </div>
              <div className="font-display text-xl font-extrabold">Daddy Zinger</div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed max-w-sm">
              Premium Pakistani fast-food. Fresh chicken, house sauces, and delivery you can set your watch to.
            </p>
            <div className="mt-6 flex gap-2">
              {[Instagram, Facebook, Twitter, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="h-10 w-10 rounded-full bg-white/5 border border-white/10 grid place-items-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                  <Icon className="h-4 w-4" />
                </a>
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
                    <li key={l}>
                      <a href="#" className="text-sm text-white/80 hover:text-primary transition-colors">{l}</a>
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
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <span className="text-white/80">+92 300 DADDY-Z</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <span className="text-white/80">hello@daddyzinger.pk</span>
              </div>
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
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
