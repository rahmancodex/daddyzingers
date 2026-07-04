
# Premium Ordering Experience Redesign

Evolve the ordering flow (menu, header on menu/cart/checkout, drawers, cart, checkout, footer) into an app-like premium experience while preserving the existing Daddy Zinger colors, typography, logo, and homepage branding.

## Scope boundaries
- **Untouched**: Homepage sections (Hero, Bestsellers, Deals, Categories, BuildMeal, WhyUs, Reviews, Gallery, DownloadApp), design tokens in `styles.css`, brand identity, logo asset, auth pages, dashboard pages, Supabase schema/logic.
- **Homepage Navbar stays** the current marketing navbar. The new ordering header is scoped to ordering routes (`/menu`, `/cart`, `/checkout`).

## 1. Ordering shell (new)
- New `src/components/order/OrderHeader.tsx`: sticky, glass background using existing tokens. Contents:
  - Logo (existing `Logo` component)
  - Location selector (Popover) — Lodhran Branch (default) / Bahawalpur Branch, persisted to `localStorage` via a tiny `location-store.ts`
  - Search food (opens existing `GlobalSearch`)
  - Offers link → `/menu#deals`
  - Rewards link → `/dashboard/rewards`
  - Account (avatar dropdown → login or dashboard links, reuses `useAuth`)
  - Cart button with live count/total → `/cart`
- New `src/components/order/MobileBottomNav.tsx`: fixed bottom bar (Menu / Offers / Cart / Account) shown on `<md` for ordering routes only.
- `menu.tsx`, `cart.tsx`, `checkout.tsx` render `<OrderHeader />` in place of the marketing `<Navbar />` and add bottom padding for the mobile bottom nav.

## 2. Menu page redesign (`src/routes/menu.tsx`)
- Top: promo carousel `PromoCarousel.tsx` (embla, existing carousel primitive) with 3 slides built from existing deal art + brand gradients.
- Layout: `md:grid md:grid-cols-[240px_1fr]` — sticky category sidebar on desktop, horizontal scroll chip strip on mobile (sticky under header).
- Category sidebar uses `scrollspy`: highlights the section in view via IntersectionObserver; clicking scrolls with header offset.
- Product cards redesigned in `ProductCard.tsx`:
  - Large 4:3 image, bestseller/spicy badges, star rating (existing menu-data rating field or fallback 4.6), 1-line description, price, heart favorite (toggle with `favorites-store.ts` persisted to localStorage + optional Supabase sync if user), `Customize` primary CTA.
  - Whole card and CTA both call `drawerActions.open(item)` (no direct add).

## 3. Product drawer upgrade (`GlobalProductDrawer.tsx`)
Restructure existing drawer:
- Hero image at top (larger, gradient overlay w/ badges).
- Sections: Description → Meal upgrades → Add-ons → Extras → Special instructions (textarea) → Quantity stepper.
- Sticky footer: live total (already computed) + `Add to cart · PKR X` button with spring animation.
- Preserve existing swap-on-related behavior and cart commit.

## 4. Floating cart + Cart drawer
- Keep `FloatingCart` but expand into a wider pill on `md+` showing item count and total (already close). On mobile hide it when the bottom nav is present (bottom nav has its own cart tab).
- New `CartDrawer.tsx` (right-side `Sheet`): items with qty steppers, remove, recommended add-ons (top 3 sides not in cart), coupon input (uses existing `coupons.ts`), delivery estimate "≈ 29 min", totals block, "Checkout" CTA linking to `/checkout`.
- `/cart` route keeps existing full page (works as fallback for direct nav). `FloatingCart` opens the drawer instead of navigating; nav cart button also opens drawer.

## 5. Checkout polish (`src/routes/checkout.tsx`)
- Keep existing 4-step logic. Visual polish only:
  - Progress stepper with numbered pills + connecting bar animated on step change.
  - Method cards larger, iconized (Delivery/Pickup/Dine-in) with fee shown.
  - Add "Estimated delivery: 29 minutes" badge in summary.
  - Promo code inline on Review step (reuses `validateCoupon`).
- No logic changes to `placeOrder` or checkout store.

## 6. Footer
Existing footer already contains brand, branches, hours, quick links, contact, socials. Add compact "Get the app" block (App Store / Play Store placeholder buttons using `soonToast`) above the bottom bar. That's the only footer change.

## 7. Mobile
- `OrderHeader` collapses: logo + location on row 1, search + cart on row 2; offers/rewards/account move to `MobileBottomNav`.
- All drawers use full-height sheets on mobile (`h-[92dvh]`).
- Cart drawer becomes bottom sheet on `<md`, right sheet on `md+` (using `useIsMobile`).
- Larger touch targets (min 44px) on all steppers/buttons in drawer + cart.

## Technical details
- New files:
  - `src/lib/location-store.ts` (branch selection)
  - `src/lib/favorites-store.ts` (heart toggle w/ localStorage, optional Supabase upsert to existing `favorites` table if present; else localStorage only)
  - `src/components/order/OrderHeader.tsx`
  - `src/components/order/LocationSelector.tsx`
  - `src/components/order/AccountMenu.tsx`
  - `src/components/order/MobileBottomNav.tsx`
  - `src/components/order/PromoCarousel.tsx`
  - `src/components/order/CategorySidebar.tsx`
  - `src/components/order/CategoryChips.tsx`
  - `src/components/order/ProductCard.tsx`
  - `src/components/order/CartDrawer.tsx`
- Edited:
  - `src/routes/menu.tsx`, `src/routes/cart.tsx`, `src/routes/checkout.tsx`
  - `src/components/site/GlobalProductDrawer.tsx` (visual restructure)
  - `src/components/site/FloatingCart.tsx` (open drawer on md, hide on mobile when bottom nav)
  - `src/components/site/Footer.tsx` (add app download block)
- Homepage `Navbar.tsx`: untouched. `Bestsellers.tsx` on homepage: untouched (still opens drawer as it already does).

## Non-goals
- No new backend tables. No changes to `placeOrder`, auth, checkout store shape, or Supabase migrations.
- No token, color, or font changes.
