-- =====================================================================
-- MENU: categories, items, sizes, option groups, option choices
-- =====================================================================

CREATE TABLE public.menu_categories (
  id text PRIMARY KEY,
  label text NOT NULL,
  icon text,
  tagline text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_categories TO anon, authenticated;
GRANT ALL ON public.menu_categories TO service_role;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Menu categories public"
  ON public.menu_categories FOR SELECT
  USING (is_active = true);
CREATE TRIGGER menu_categories_touch BEFORE UPDATE ON public.menu_categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.menu_items (
  id text PRIMARY KEY,
  category_id text NOT NULL REFERENCES public.menu_categories(id) ON DELETE RESTRICT,
  name text NOT NULL,
  price_pkr integer NOT NULL DEFAULT 0,
  short_description text,
  long_description text,
  image_url text,
  gallery_urls text[] NOT NULL DEFAULT '{}',
  rating numeric(3,2) NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  prep_time_min integer NOT NULL DEFAULT 10,
  calories integer NOT NULL DEFAULT 0,
  ingredients text[] NOT NULL DEFAULT '{}',
  allergens text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  is_available boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_bestseller boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX menu_items_category_idx ON public.menu_items(category_id, sort_order);
CREATE INDEX menu_items_visibility_idx ON public.menu_items(is_hidden, is_available);
CREATE INDEX menu_items_featured_idx ON public.menu_items(is_featured) WHERE is_featured = true;
CREATE INDEX menu_items_bestseller_idx ON public.menu_items(is_bestseller) WHERE is_bestseller = true;
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Menu items public when visible"
  ON public.menu_items FOR SELECT
  USING (is_hidden = false);
CREATE TRIGGER menu_items_touch BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.menu_item_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id text NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  size_key text NOT NULL,
  label text NOT NULL,
  price_pkr integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (item_id, size_key)
);
CREATE INDEX menu_item_sizes_item_idx ON public.menu_item_sizes(item_id, sort_order);
GRANT SELECT ON public.menu_item_sizes TO anon, authenticated;
GRANT ALL ON public.menu_item_sizes TO service_role;
ALTER TABLE public.menu_item_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Menu item sizes public"
  ON public.menu_item_sizes FOR SELECT USING (true);

CREATE TABLE public.option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id text REFERENCES public.menu_items(id) ON DELETE CASCADE,
  category_id text REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  group_key text NOT NULL,
  label text NOT NULL,
  selection_type text NOT NULL CHECK (selection_type IN ('single','multi')),
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  CHECK ((item_id IS NULL) <> (category_id IS NULL))
);
CREATE INDEX option_groups_item_idx ON public.option_groups(item_id, sort_order) WHERE item_id IS NOT NULL;
CREATE INDEX option_groups_category_idx ON public.option_groups(category_id, sort_order) WHERE category_id IS NOT NULL;
GRANT SELECT ON public.option_groups TO anon, authenticated;
GRANT ALL ON public.option_groups TO service_role;
ALTER TABLE public.option_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Option groups public"
  ON public.option_groups FOR SELECT USING (true);

CREATE TABLE public.option_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.option_groups(id) ON DELETE CASCADE,
  choice_key text NOT NULL,
  label text NOT NULL,
  price_delta_pkr integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (group_id, choice_key)
);
CREATE INDEX option_choices_group_idx ON public.option_choices(group_id, sort_order);
GRANT SELECT ON public.option_choices TO anon, authenticated;
GRANT ALL ON public.option_choices TO service_role;
ALTER TABLE public.option_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Option choices public"
  ON public.option_choices FOR SELECT USING (true);

-- =====================================================================
-- PROMO BANNERS
-- =====================================================================

CREATE TABLE public.promo_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  cta_text text,
  cta_link text,
  desktop_image_url text,
  mobile_image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  branch_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX promo_banners_active_idx ON public.promo_banners(is_active, sort_order);
GRANT SELECT ON public.promo_banners TO anon, authenticated;
GRANT ALL ON public.promo_banners TO service_role;
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;
-- Use a trigger-friendly, IMMUTABLE-compatible policy: filter with now() at query time.
CREATE POLICY "Active banners public"
  ON public.promo_banners FOR SELECT
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );
CREATE TRIGGER promo_banners_touch BEFORE UPDATE ON public.promo_banners
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- COUPONS + REDEMPTIONS (server-validated only)
-- =====================================================================

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','flat')),
  percent integer,
  flat_pkr integer,
  min_subtotal_pkr integer NOT NULL DEFAULT 0,
  max_discount_pkr integer,
  usage_limit integer,
  per_user_limit integer NOT NULL DEFAULT 1,
  usage_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  branch_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (discount_type = 'percent' AND percent IS NOT NULL AND percent BETWEEN 1 AND 100 AND flat_pkr IS NULL)
    OR (discount_type = 'flat' AND flat_pkr IS NOT NULL AND flat_pkr > 0 AND percent IS NULL)
  )
);
CREATE INDEX coupons_code_active_idx ON public.coupons(code) WHERE is_active = true;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
-- Intentionally no client SELECT policy. Coupons are validated exclusively via
-- server functions using the service-role client. This prevents anyone from
-- enumerating active codes from the browser.
CREATE TRIGGER coupons_touch BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_pkr integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coupon_redemptions_user_idx ON public.coupon_redemptions(user_id, coupon_id);
CREATE INDEX coupon_redemptions_coupon_idx ON public.coupon_redemptions(coupon_id);
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================================
-- ORDERS: status enum + new columns
-- =====================================================================

CREATE TYPE public.order_status AS ENUM (
  'pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled'
);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_method text NOT NULL DEFAULT 'delivery'
    CHECK (fulfillment_method IN ('delivery','pickup','dinein')),
  ADD COLUMN IF NOT EXISTS schedule_at timestamptz,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount_pkr integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pkr integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_delivery_minutes integer,
  ADD COLUMN IF NOT EXISTS branch_id uuid,
  ADD COLUMN IF NOT EXISTS special_instructions text;

-- Convert status text -> enum, coercing any legacy values to 'pending'.
ALTER TABLE public.orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.orders
  ALTER COLUMN status TYPE public.order_status
  USING (
    CASE lower(status)
      WHEN 'pending' THEN 'pending'::public.order_status
      WHEN 'confirmed' THEN 'confirmed'::public.order_status
      WHEN 'preparing' THEN 'preparing'::public.order_status
      WHEN 'ready' THEN 'ready'::public.order_status
      WHEN 'out_for_delivery' THEN 'out_for_delivery'::public.order_status
      WHEN 'delivered' THEN 'delivered'::public.order_status
      WHEN 'cancelled' THEN 'cancelled'::public.order_status
      ELSE 'pending'::public.order_status
    END
  );
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending'::public.order_status;

CREATE INDEX IF NOT EXISTS orders_user_created_idx ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);

CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- Helpful indexes on existing user-scoped tables (perf)
-- =====================================================================
CREATE INDEX IF NOT EXISTS user_addresses_user_idx ON public.user_addresses(user_id, is_default DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS user_favorites_user_idx ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items(order_id);
