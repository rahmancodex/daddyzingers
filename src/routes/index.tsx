import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/site/Hero";
import { OrderingExperience } from "@/components/order/OrderingExperience";
import { Categories } from "@/components/site/Categories";
import { Bestsellers } from "@/components/site/Bestsellers";
import { WhyUs } from "@/components/site/WhyUs";
import { Deals } from "@/components/site/Deals";
import { BuildMeal } from "@/components/site/BuildMeal";
import { Reviews } from "@/components/site/Reviews";
import { Gallery } from "@/components/site/Gallery";
import { DownloadApp } from "@/components/site/DownloadApp";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Daddy Zinger — Crafted for Cravings" },
      {
        name: "description",
        content:
          "Premium Pakistani fast-food. Hand-breaded zingers, house sauces, and 29-minute delivery. Order online for pickup or delivery.",
      },
      { property: "og:title", content: "Daddy Zinger — Crafted for Cravings" },
      { property: "og:description", content: "Premium zingers, wings, burgers and wraps. Delivered hot in 29 minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground pb-20 md:pb-0">
      {/* Ordering experience leads the homepage (includes header + promo carousel) */}
      <OrderingExperience />

      {/* Marketing sections below */}
      <div>
        <Categories />
        <Bestsellers />
        <WhyUs />
        <Deals />
        <BuildMeal />
        <Reviews />
        <Gallery />
        <DownloadApp />
      </div>

      <Footer />
    </div>
  );
}

