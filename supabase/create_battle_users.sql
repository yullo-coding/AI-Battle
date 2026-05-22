CREATE TABLE IF NOT EXISTS battle_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE battle_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon all" ON battle_users FOR ALL TO anon USING (true) WITH CHECK (true);
