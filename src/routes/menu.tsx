import { createFileRoute } from "@tanstack/react-router";
import { OrderingExperience } from "@/components/order/OrderingExperience";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/menu")({
  component: MenuPage,
  head: () => ({
    meta: [
      { title: "Menu — Daddy Zinger | Zingers, Burgers, Shawarma & More" },
      {
        name: "description",
        content:
          "Explore the full Daddy Zinger menu — Zinger burgers, shawarma, paratha rolls, platters, broast, loaded fries and more. Order online with fast delivery across Pakistan.",
      },
      { property: "og:title", content: "Daddy Zinger Menu — Crafted for Cravings" },
      {
        property: "og:description",
        content:
          "Zinger burgers, shawarma, rolls, broast and loaded fries — the full Daddy Zinger menu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function MenuPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground pb-20 md:pb-0">
      <OrderingExperience />
      <Footer />
    </div>
  );
}
