import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://daddyzingers.lovable.app";

interface Entry {
  path: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: string;
}

const ENTRIES: Entry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/menu", changefreq: "daily", priority: "0.9" },
  { path: "/welcome", changefreq: "monthly", priority: "0.4" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = ENTRIES.map(
          (e) =>
            `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n` +
            (e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>\n` : "") +
            (e.priority ? `    <priority>${e.priority}</priority>\n` : "") +
            `  </url>`,
        );
        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls.join("\n") +
          `\n</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
