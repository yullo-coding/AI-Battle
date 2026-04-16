-- ============================================================
-- AI Battle — Supabase 스키마
-- 기존 프로젝트(vpcphafujbdwnupkeuxy)에 실행
-- ============================================================

-- 배틀 라운드 테이블
CREATE TABLE IF NOT EXISTS battle_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_symbol TEXT NOT NULL,
  stock_name TEXT NOT NULL,
  stock_market TEXT NOT NULL CHECK (stock_market IN ('US', 'KR')),
  start_price DECIMAL,
  end_price DECIMAL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  ai_prediction TEXT CHECK (ai_prediction IN ('UP', 'DOWN')),
  ai_confidence INT CHECK (ai_confidence BETWEEN 0 AND 100),
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 유저 예측 테이블
CREATE TABLE IF NOT EXISTS battle_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES battle_rounds(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  nickname TEXT,
  prediction TEXT NOT NULL CHECK (prediction IN ('UP', 'DOWN')),
  period_days INT NOT NULL CHECK (period_days BETWEEN 1 AND 7),
  result TEXT CHECK (result IN ('WIN', 'LOSE')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(round_id, phone)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_battle_rounds_status ON battle_rounds(status);
CREATE INDEX IF NOT EXISTS idx_battle_predictions_round ON battle_predictions(round_id);
CREATE INDEX IF NOT EXISTS idx_battle_predictions_phone ON battle_predictions(phone);

-- RLS 활성화
ALTER TABLE battle_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_predictions ENABLE ROW LEVEL SECURITY;

-- RLS 정책: anon 읽기 허용
CREATE POLICY "anon can read battle_rounds"
  ON battle_rounds FOR SELECT TO anon USING (true);

CREATE POLICY "anon can read battle_predictions"
  ON battle_predictions FOR SELECT TO anon USING (true);

-- RLS 정책: anon 쓰기 허용 (예측 제출)
CREATE POLICY "anon can insert battle_predictions"
  ON battle_predictions FOR INSERT TO anon WITH CHECK (true);

-- RLS 정책: 라운드 생성은 service_role만 (어드민)
CREATE POLICY "service role can manage battle_rounds"
  ON battle_rounds FOR ALL TO service_role USING (true);

CREATE POLICY "service role can update battle_predictions"
  ON battle_predictions FOR UPDATE TO service_role USING (true);

-- ============================================================
-- 샘플 데이터 (테스트용)
-- ============================================================

-- 활성 배틀 라운드 예시 (실행 전 날짜 확인)
/*
INSERT INTO battle_rounds (stock_symbol, stock_name, stock_market, start_at, end_at, ai_prediction, ai_confidence, ai_reasoning)
VALUES
  ('005930.KS', '삼성전자', 'KR', now(), now() + interval '3 days', NULL, NULL, NULL),
  ('NVDA', 'NVIDIA', 'US', now(), now() + interval '5 days', NULL, NULL, NULL),
  ('TSLA', 'Tesla', 'US', now(), now() + interval '7 days', NULL, NULL, NULL);
*/
