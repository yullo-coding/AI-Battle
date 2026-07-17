-- AI 투자 도구 커뮤니티 + 배틀 연결

CREATE TABLE IF NOT EXISTS ai_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  name_en TEXT,
  tagline TEXT NOT NULL CHECK (char_length(tagline) BETWEEN 5 AND 120),
  tagline_en TEXT,
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 20 AND 2000),
  description_en TEXT,
  website_url TEXT NOT NULL,
  logo_url TEXT,
  supported_markets TEXT[] NOT NULL DEFAULT ARRAY['US','KR'],
  pricing TEXT NOT NULL DEFAULT 'free' CHECK (pricing IN ('free','freemium','paid')),
  integration_type TEXT NOT NULL DEFAULT 'link' CHECK (integration_type IN ('built_in','link','api')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  api_version TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_tools ADD COLUMN IF NOT EXISTS api_version TEXT;
ALTER TABLE ai_tools ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE ai_tools ADD COLUMN IF NOT EXISTS tagline_en TEXT;
ALTER TABLE ai_tools ADD COLUMN IF NOT EXISTS description_en TEXT;

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

-- 제작자 API 주소와 인증 토큰은 공개 도구 정보와 분리한다.
-- 이 테이블은 service_role만 접근하며 anon/authenticated 정책을 만들지 않는다.
CREATE TABLE IF NOT EXISTS ai_tool_integrations (
  tool_id UUID PRIMARY KEY REFERENCES ai_tools(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  auth_token TEXT,
  api_version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('pending','verified','disabled','failed')),
  last_verified_at TIMESTAMPTZ,
  last_called_at TIMESTAMPTZ,
  call_count BIGINT NOT NULL DEFAULT 0,
  failure_count BIGINT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_tools_published ON ai_tools(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tool_likes_tool ON ai_tool_likes(tool_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_reviews_tool ON ai_tool_reviews(tool_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tool_integrations_status ON ai_tool_integrations(status);

ALTER TABLE ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read tools" ON ai_tools;
DROP POLICY IF EXISTS "anon manage tools" ON ai_tools;
DROP POLICY IF EXISTS "anon manage likes" ON ai_tool_likes;
DROP POLICY IF EXISTS "anon manage reviews" ON ai_tool_reviews;

CREATE POLICY "public read tools" ON ai_tools FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "anon manage likes" ON ai_tool_likes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon manage reviews" ON ai_tool_reviews FOR ALL TO anon USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE ai_tool_integrations FROM anon, authenticated;

-- AI Battle 기본 무료 도구. 고정 UUID라 여러 번 실행해도 중복되지 않는다.
INSERT INTO ai_tools (
  id, owner_email, name, name_en, tagline, tagline_en, description, description_en, website_url,
  supported_markets, pricing, integration_type, verification_status,
  is_published, is_featured
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  'system@ai-battle.local',
  'AI Battle 기본 분석기',
  'AI Battle Core Analyzer',
  '기술적 지표를 조합해 설명 가능한 예측을 만드는 무료 도구',
  'A free, explainable predictor built from technical indicators',
  'RSI, MACD, 볼린저 밴드, 이동평균선과 시장 심리를 점수화합니다. 외부 유료 AI 호출 없이 작동하며 각 판단 근거를 공개합니다.',
  'Scores RSI, MACD, Bollinger Bands, moving averages, and market sentiment. It runs without paid external AI calls and explains each signal behind its prediction.',
  'https://ai-battle-gamma.vercel.app',
  ARRAY['US','KR'], 'free', 'built_in', 'verified', true, true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  tagline = EXCLUDED.tagline,
  tagline_en = EXCLUDED.tagline_en,
  description = EXCLUDED.description,
  description_en = EXCLUDED.description_en,
  updated_at = now();

-- 공식 사이트에서 확인한 외부 AI 투자 서비스 큐레이션.
-- 아직 AI Battle이 결과를 직접 호출하지 않으므로 링크·리뷰 전용(pending)으로 공개한다.
INSERT INTO ai_tools (
  id, owner_email, name, name_en, tagline, tagline_en, description, description_en, website_url,
  supported_markets, pricing, integration_type, verification_status,
  is_published, is_featured
) VALUES
(
  '00000000-0000-4000-8000-000000000101',
  'curation@ai-battle.local',
  'Composer',
  'Composer',
  '자연어로 투자 전략을 만들고 백테스트와 자동 실행까지 연결하는 서비스',
  'Build, backtest, and automate investing strategies with natural language',
  '목표와 위험 조건을 자연어로 설명하면 AI가 규칙 기반 투자 전략을 구성합니다. 전략 백테스트, 커뮤니티 공유, 자동 리밸런싱을 지원하는 미국 중심 서비스입니다.',
  'Describe goals and risk rules in plain language to build rule-based strategies. The US-focused service supports backtesting, community sharing, and automated rebalancing.',
  'https://www.composer.trade/',
  ARRAY['US'], 'paid', 'link', 'pending', true, false
),
(
  '00000000-0000-4000-8000-000000000102',
  'curation@ai-battle.local',
  'TrendSpider AI Strategy Lab',
  'TrendSpider AI Strategy Lab',
  '머신러닝 모델을 직접 훈련하고 백테스트·알림·봇으로 연결하는 분석 도구',
  'Train machine-learning models and connect them to tests, alerts, and bots',
  'Random Forest, KNN 등 예측 모델을 코딩 없이 훈련하고 차트, 스캐너, 백테스트와 자동화 봇에 적용할 수 있습니다. 미국 주식과 ETF, 선물, 암호화폐, 외환 등을 지원합니다.',
  'Train models such as Random Forest and KNN without code, then use them in charts, scanners, backtests, and automation bots across stocks, ETFs, futures, crypto, and FX.',
  'https://trendspider.com/product/artificial-intelligence-ai-trading-strategy-lab/',
  ARRAY['US','Crypto','FX'], 'paid', 'link', 'pending', true, false
),
(
  '00000000-0000-4000-8000-000000000103',
  'curation@ai-battle.local',
  'Danelfin',
  'Danelfin',
  '기술·펀더멘털·심리 데이터를 종합한 AI 점수로 종목을 비교하는 서비스',
  'Compare stocks with AI scores across technical, fundamental, and sentiment data',
  '미국과 유럽 주식 및 ETF를 AI 점수로 비교합니다. 기술적 지표, 기업 기초체력, 시장 심리와 위험도를 함께 보여주며 중기 투자 아이디어 탐색에 적합합니다.',
  'Compare US and European stocks and ETFs with AI scores covering technicals, fundamentals, market sentiment, and risk for medium-term idea discovery.',
  'https://danelfin.com/',
  ARRAY['US','EU'], 'freemium', 'link', 'pending', true, false
),
(
  '00000000-0000-4000-8000-000000000104',
  'curation@ai-battle.local',
  'Capitalise.ai',
  'Capitalise.ai',
  '일상 언어로 매매 조건을 작성해 백테스트와 자동 실행을 만드는 노코드 도구',
  'Create, backtest, and automate trading rules in everyday language',
  '코딩 없이 평범한 문장으로 진입·청산 조건을 만들고 과거 데이터 백테스트, 모의 거래, 실시간 알림과 자동 실행을 설정할 수 있습니다. 이용 가능 시장은 연결한 파트너에 따라 달라집니다.',
  'Write entry and exit rules in plain language, then run historical tests, paper trading, live alerts, and automation. Market coverage depends on the connected partner.',
  'https://capitalise.ai/',
  ARRAY['Global'], 'freemium', 'link', 'pending', true, false
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  tagline = EXCLUDED.tagline,
  tagline_en = EXCLUDED.tagline_en,
  description = EXCLUDED.description,
  description_en = EXCLUDED.description_en,
  website_url = EXCLUDED.website_url,
  supported_markets = EXCLUDED.supported_markets,
  pricing = EXCLUDED.pricing,
  integration_type = EXCLUDED.integration_type,
  verification_status = EXCLUDED.verification_status,
  is_published = EXCLUDED.is_published,
  updated_at = now();

ALTER TABLE battles ADD COLUMN IF NOT EXISTS ai_tool_id UUID REFERENCES ai_tools(id) ON DELETE SET NULL;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS ai_tool_name TEXT;

UPDATE battles
SET ai_tool_id = '00000000-0000-4000-8000-000000000001',
    ai_tool_name = 'AI Battle 기본 분석기'
WHERE ai_tool_id IS NULL;
