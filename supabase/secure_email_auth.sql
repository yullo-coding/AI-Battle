-- Supabase Auth 기반 계정 소유권 + 개인정보 보호 마이그레이션

ALTER TABLE public.battle_users ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.ai_tools ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.ai_tool_likes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ai_tool_reviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ai_tool_integrations ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_battle_users_user_id ON public.battle_users(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_battles_user_id ON public.battles(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tools_owner_user_id ON public.ai_tools(owner_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_tool_likes_user_id ON public.ai_tool_likes(tool_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_tool_reviews_user_id ON public.ai_tool_reviews(tool_id, user_id) WHERE user_id IS NOT NULL;

-- 공개 화면에서는 이메일과 사용자 UUID를 제외한 안전한 뷰만 조회한다.
CREATE OR REPLACE VIEW public.public_battles AS
SELECT
  b.id,
  b.stock_symbol,
  b.stock_name,
  b.stock_market,
  b.start_price,
  b.end_date,
  b.user_change_percent,
  b.ai_change_percent,
  b.ai_confidence,
  b.ai_reasoning,
  b.ai_tool_id,
  b.ai_tool_name,
  b.end_price,
  b.actual_change_percent,
  b.user_error,
  b.ai_error,
  b.winner,
  b.status,
  b.created_at,
  COALESCE(b.user_id::text, u.user_id::text, u.id::text, b.id::text) AS player_id,
  COALESCE(NULLIF(u.nickname, ''), '익명 트레이더') AS player_nickname
FROM public.battles b
LEFT JOIN public.battle_users u
  ON (b.user_id IS NOT NULL AND u.user_id = b.user_id)
  OR (b.user_id IS NULL AND lower(u.email) = lower(b.email));

CREATE OR REPLACE VIEW public.public_ai_tools AS
SELECT
  id, name, name_en, tagline, tagline_en, description, description_en,
  website_url, logo_url, supported_markets, pricing, integration_type,
  verification_status, api_version, is_published, is_featured, created_at, updated_at
FROM public.ai_tools
WHERE is_published = true;

CREATE OR REPLACE VIEW public.public_ai_tool_reviews AS
SELECT id, tool_id, nickname, rating, content, created_at, updated_at
FROM public.ai_tool_reviews;

CREATE OR REPLACE VIEW public.ai_tool_public_stats AS
SELECT
  t.id AS tool_id,
  COUNT(DISTINCT l.id)::INT AS like_count,
  COUNT(DISTINCT r.id)::INT AS review_count,
  ROUND(AVG(r.rating)::NUMERIC, 2) AS average_rating
FROM public.ai_tools t
LEFT JOIN public.ai_tool_likes l ON l.tool_id = t.id
LEFT JOIN public.ai_tool_reviews r ON r.tool_id = t.id
WHERE t.is_published = true
GROUP BY t.id;

-- 과거의 익명 전체 허용 정책을 모두 제거한다.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('battle_users','battles','ai_tools','ai_tool_likes','ai_tool_reviews')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

ALTER TABLE public.battle_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own profile" ON public.battle_users
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users update own profile" ON public.battle_users
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "users read own battles" ON public.battles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "owners read own tools" ON public.ai_tools
  FOR SELECT TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "owners update own tools" ON public.ai_tools
  FOR UPDATE TO authenticated USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "owners delete own tools" ON public.ai_tools
  FOR DELETE TO authenticated USING (owner_user_id = auth.uid());

CREATE POLICY "users read own likes" ON public.ai_tool_likes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users add own likes" ON public.ai_tool_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users delete own likes" ON public.ai_tool_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "users read own reviews" ON public.ai_tool_reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users add own reviews" ON public.ai_tool_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own reviews" ON public.ai_tool_reviews
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users delete own reviews" ON public.ai_tool_reviews
  FOR DELETE TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON TABLE public.battle_users, public.battles, public.ai_tools, public.ai_tool_likes, public.ai_tool_reviews FROM anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.battle_users TO authenticated;
GRANT SELECT ON TABLE public.battles TO authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.ai_tools TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.ai_tool_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_tool_reviews TO authenticated;

REVOKE ALL ON TABLE public.public_battles, public.public_ai_tools, public.public_ai_tool_reviews, public.ai_tool_public_stats FROM anon, authenticated;
GRANT SELECT ON TABLE public.public_battles, public.public_ai_tools, public.public_ai_tool_reviews, public.ai_tool_public_stats TO anon, authenticated;

REVOKE ALL ON TABLE public.ai_tool_integrations FROM anon, authenticated;
