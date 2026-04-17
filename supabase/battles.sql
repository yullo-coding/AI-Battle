-- ============================================================
-- AI Battle v2 — battles 테이블
-- 기존 battle_rounds + battle_predictions 대체
-- ============================================================

CREATE TABLE IF NOT EXISTS battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,

  -- 종목 정보 (예측 시점 스냅샷)
  stock_symbol TEXT NOT NULL,
  stock_name   TEXT NOT NULL,
  stock_market TEXT NOT NULL CHECK (stock_market IN ('US','KR')),
  start_price  DECIMAL NOT NULL,

  -- 배틀 파라미터
  end_date DATE NOT NULL,          -- 유저가 선택한 결과 확인 날짜

  -- 유저 예측
  user_change_percent DECIMAL,     -- 양수 = 상승, 음수 = 하락 (e.g. 4.5 = +4.5%)

  -- AI 예측
  ai_change_percent DECIMAL,
  ai_confidence     INT CHECK (ai_confidence BETWEEN 0 AND 100),
  ai_reasoning      TEXT,          -- JSON 문자열 { brief, technical, sentiment, risk, conclusion }

  -- 결과 (end_date 이후 방문 시 자동 채워짐)
  end_price             DECIMAL,
  actual_change_percent DECIMAL,
  user_error            DECIMAL,   -- |user_change - actual_change|
  ai_error              DECIMAL,   -- |ai_change - actual_change|
  winner                TEXT CHECK (winner IN ('USER','AI','TIE')),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_battles_phone  ON battles(phone);
CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
CREATE INDEX IF NOT EXISTS idx_battles_end_date ON battles(end_date);

-- RLS
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon can do all on battles"
  ON battles FOR ALL TO anon USING (true) WITH CHECK (true);
