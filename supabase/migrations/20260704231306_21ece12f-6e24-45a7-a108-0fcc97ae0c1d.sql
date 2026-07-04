
-- =========================
-- Integration configuration (Google, SMTP, SMS, Push, Payments)
-- =========================
CREATE TABLE public.integration_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'sandbox',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'not_configured',
  last_tested_at TIMESTAMPTZ,
  last_test_result JSONB,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_configs TO authenticated;
GRANT ALL ON public.integration_configs TO service_role;
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage integration configs"
  ON public.integration_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- =========================
-- Email templates
-- =========================
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage email templates"
  ON public.email_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- =========================
-- Webhook endpoints & deliveries
-- =========================
CREATE TABLE public.webhook_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  secret_hint TEXT,
  events TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_status TEXT,
  last_delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO authenticated;
GRANT ALL ON public.webhook_endpoints TO service_role;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage webhook endpoints"
  ON public.webhook_endpoints FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.webhook_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint_id UUID REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt INT NOT NULL DEFAULT 1,
  response_code INT,
  response_body TEXT,
  payload JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_deliveries_endpoint ON public.webhook_deliveries(endpoint_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries(status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view webhook deliveries"
  ON public.webhook_deliveries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- =========================
-- Error logs (frontend/server/auth/payment/webhook)
-- =========================
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'error',
  message TEXT NOT NULL,
  stack TEXT,
  context JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_error_logs_created ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_source ON public.error_logs(source, created_at DESC);
CREATE INDEX idx_error_logs_level ON public.error_logs(level, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.error_logs TO authenticated;
GRANT INSERT ON public.error_logs TO anon;
GRANT ALL ON public.error_logs TO service_role;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view error logs"
  ON public.error_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can insert error logs"
  ON public.error_logs FOR INSERT TO authenticated, anon
  WITH CHECK (true);
CREATE POLICY "Owners delete error logs"
  ON public.error_logs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- =========================
-- Backup snapshots (metadata only; storage is external)
-- =========================
CREATE TABLE public.backup_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  size_bytes BIGINT,
  storage_path TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backup_snapshots TO authenticated;
GRANT ALL ON public.backup_snapshots TO service_role;
ALTER TABLE public.backup_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage backup snapshots"
  ON public.backup_snapshots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- =========================
-- updated_at triggers
-- =========================
CREATE TRIGGER trg_integration_configs_updated
  BEFORE UPDATE ON public.integration_configs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_email_templates_updated
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_webhook_endpoints_updated
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================
-- Seed default email templates
-- =========================
INSERT INTO public.email_templates (key, name, subject, body_html, variables) VALUES
  ('welcome', 'Welcome Email', 'Welcome to Daddy Zingers, {{name}}!', '<h1>Welcome {{name}}</h1><p>Thanks for joining Daddy Zingers.</p>', '["name","email"]'::jsonb),
  ('email_verification', 'Email Verification', 'Verify your email', '<p>Hi {{name}}, click <a href="{{verify_url}}">here</a> to verify your email.</p>', '["name","verify_url"]'::jsonb),
  ('password_reset', 'Password Reset', 'Reset your password', '<p>Click <a href="{{reset_url}}">here</a> to reset your password.</p>', '["name","reset_url"]'::jsonb),
  ('order_confirmation', 'Order Confirmation', 'Order #{{order_number}} confirmed', '<h2>Thanks for your order!</h2><p>Order #{{order_number}} — Total: {{total}}</p>', '["name","order_number","total","items"]'::jsonb),
  ('order_cancelled', 'Order Cancelled', 'Order #{{order_number}} cancelled', '<p>Your order #{{order_number}} has been cancelled.</p>', '["name","order_number","reason"]'::jsonb),
  ('order_delivered', 'Order Delivered', 'Order #{{order_number}} delivered', '<p>Your order #{{order_number}} was delivered. Enjoy!</p>', '["name","order_number"]'::jsonb),
  ('coupon', 'Coupon Email', 'A special offer for you 🎁', '<p>Hi {{name}}, use code <b>{{code}}</b> to save {{discount}}!</p>', '["name","code","discount","expires_at"]'::jsonb),
  ('newsletter', 'Newsletter', '{{subject}}', '<div>{{content}}</div>', '["subject","content"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =========================
-- Seed default integration keys
-- =========================
INSERT INTO public.integration_configs (key, category, enabled, mode, config) VALUES
  ('google_oauth', 'auth', false, 'production', '{}'::jsonb),
  ('smtp', 'email', false, 'production', '{"host":"","port":587,"username":"","encryption":"tls","sender_name":"","sender_email":"","reply_to":"","email_verification":true,"password_reset":true}'::jsonb),
  ('twilio', 'sms', false, 'sandbox', '{"account_sid":"","from_number":"","use_cases":{"otp":true,"order_updates":true,"delivery_updates":true,"promotional":false}}'::jsonb),
  ('whatsapp_cloud', 'sms', false, 'sandbox', '{"phone_number_id":"","business_account_id":"","use_cases":{"otp":true,"order_updates":true,"delivery_updates":true,"promotional":false}}'::jsonb),
  ('fcm', 'push', false, 'production', '{"project_id":"","sender_id":"","vapid_public_key":"","order_notifications":true,"promotional":false}'::jsonb),
  ('web_push', 'push', false, 'production', '{"vapid_public_key":"","vapid_subject":""}'::jsonb),
  ('stripe', 'payment', false, 'sandbox', '{"publishable_key":"","webhook_endpoint":""}'::jsonb),
  ('jazzcash', 'payment', false, 'sandbox', '{"merchant_id":"","return_url":""}'::jsonb),
  ('easypaisa', 'payment', false, 'sandbox', '{"store_id":"","return_url":""}'::jsonb),
  ('cod', 'payment', true, 'production', '{"min_order":0,"max_order":0}'::jsonb)
ON CONFLICT (key) DO NOTHING;
