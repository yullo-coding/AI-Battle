-- AI 투자 도구 커뮤니티 + 배틀 연결

CREATE TABLE IF NOT EXISTS ai_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  tagline TEXT NOT NULL CHECK (char_length(tagline) BETWEEN 5 AND 120),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 20 AND 2000),
  website_url TEXT NOT NULL,
  logo_url TEXT,
  supported_markets TEXT[] NOT NULL DEFAULT ARRAY['US','KR'],
  pricing TEXT NOT NULL DEFAULT 'free' CHECK (pricing IN ('free','freemium','paid')),
  integration_type TEXT NOT NULL DEFAULT 'link' CHECK (integration_type IN ('built_in','link','api')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_tool_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tool_id, user_email)
);

CREATE TABLE IF NOT EXISTS ai_tool_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  nickname TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 10 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tool_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_ai_tools_published ON ai_tools(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tool_likes_tool ON ai_tool_likes(tool_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_reviews_tool ON ai_tool_reviews(tool_id, created_at DESC);

ALTER TABLE ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read tools" ON ai_tools;
DROP POLICY IF EXISTS "anon manage tools" ON ai_tools;
DROP POLICY IF EXISTS "anon manage likes" ON ai_tool_likes;
DROP POLICY IF EXISTS "anon manage reviews" ON ai_tool_reviews;

CREATE POLICY "public read tools" ON ai_tools FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "anon manage tools" ON ai_tools FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon manage likes" ON ai_tool_likes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon manage reviews" ON ai_tool_reviews FOR ALL TO anon USING (true) WITH CHECK (true);

-- AI Battle 기본 무료 도구. 고정 UUID라 여러 번 실행해도 중복되지 않는다.
INSERT INTO ai_tools (
  id, owner_email, name, tagline, description, website_url,
  supported_markets, pricing, integration_type, verification_status,
  is_published, is_featured
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  'system@ai-battle.local',
  'AI Battle 기본 분석기',
  '기술적 지표를 조합해 설명 가능한 예측을 만드는 무료 도구',
  'RSI, MACD, 볼린저 밴드, 이동평균선과 시장 심리를 점수화합니다. 외부 유료 AI 호출 없이 작동하며 각 판단 근거를 공개합니다.',
  'https://ai-battle-gamma.vercel.app',
  ARRAY['US','KR'], 'free', 'built_in', 'verified', true, true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  updated_at = now();

ALTER TABLE battles ADD COLUMN IF NOT EXISTS ai_tool_id UUID REFERENCES ai_tools(id) ON DELETE SET NULL;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS ai_tool_name TEXT;

UPDATE battles
SET ai_tool_id = '00000000-0000-4000-8000-000000000001',
    ai_tool_name = 'AI Battle 기본 분석기'
WHERE ai_tool_id IS NULL;
