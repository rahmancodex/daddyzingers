import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Toaster } from "sonner";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { LOGO_MARK_URL } from "../components/site/Logo";
import { GlobalProductDrawer } from "../components/site/GlobalProductDrawer";
import { GlobalSearch } from "../components/site/GlobalSearch";
import { FloatingCart } from "../components/site/FloatingCart";
import { CartDrawer } from "../components/order/CartDrawer";
import { AuthProvider } from "../lib/auth";
import { menuQueryOptions } from "../lib/menu";
import { registeredServerFunctions } from "../lib/server-function-registry";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Prime the shared menu cache on every route match. Non-blocking:
  // failures leave `useMenuItems()` returning [] and consumers show
  // their existing empty/loading state instead of crashing the app.
  loader: ({ context }) => {
    void registeredServerFunctions;
    context.queryClient.prefetchQuery(menuQueryOptions);
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Daddy Zinger" },
      {
        name: "description",
        content:
          "Daddy Zinger — bold, premium Pakistani fast food. Zingers, burgers, shawarmas, loaded fries and family deals with fast delivery, JazzCash, EasyPaisa and cash on delivery.",
      },
      { name: "author", content: "Daddy Zinger" },
      { name: "theme-color", content: "#0f0f0e" },
      { property: "og:title", content: "Daddy Zinger" },
      {
        property: "og:description",
        content: "Zingers, burgers and family deals, crafted bold. Order online for fast delivery across Pakistan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Daddy Zinger" },
      { name: "description", content: "Premium Pakistani fast-food. Hand-breaded zingers, house sauces, and 18-minute delivery. Order online for pickup or delivery." },
      { property: "og:description", content: "Premium Pakistani fast-food. Hand-breaded zingers, house sauces, and 18-minute delivery. Order online for pickup or delivery." },
      { name: "twitter:description", content: "Premium Pakistani fast-food. Hand-breaded zingers, house sauces, and 18-minute delivery. Order online for pickup or delivery." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/12da2c5b-4751-446f-9543-efa837f94dfc/id-preview-daa217d2--510624c8-f2bb-4ec5-9c23-784edf7c858e.lovable.app-1783144721608.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/12da2c5b-4751-446f-9543-efa837f94dfc/id-preview-daa217d2--510624c8-f2bb-4ec5-9c23-784edf7c858e.lovable.app-1783144721608.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: LOGO_MARK_URL, type: "image/png" },
      { rel: "apple-touch-icon", href: LOGO_MARK_URL },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        {!isAdmin && (
          <>
            <GlobalProductDrawer />
            <GlobalSearch />
            <FloatingCart />
            <CartDrawer />
          </>
        )}
        <Toaster
          position="top-center"
          theme="dark"
          richColors
          toastOptions={{
            className:
              "!bg-background !text-foreground !border !border-border !rounded-2xl !shadow-[var(--shadow-4)] !font-medium",
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
