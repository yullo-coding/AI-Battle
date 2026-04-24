-- 1. battles 테이블: phone → email
ALTER TABLE battles RENAME COLUMN phone TO email;

-- 2. signups 테이블: email 컬럼 추가
ALTER TABLE signups ADD COLUMN IF NOT EXISTS email TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS signups_email_idx ON signups(email) WHERE email IS NOT NULL;
