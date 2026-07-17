import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const projectRef = 'nwdowvjzhjnewgfexnzw'
const storedCredential = execFileSync(
  'security',
  ['find-generic-password', '-s', 'Supabase CLI', '-w'],
  { encoding: 'utf8' }
).trim()
const accessToken = storedCredential.startsWith('go-keyring-base64:')
  ? Buffer.from(storedCredential.slice('go-keyring-base64:'.length), 'base64').toString('utf8')
  : storedCredential
const query = readFileSync(new URL('../supabase/ai_tools.sql', import.meta.url), 'utf8')

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query, read_only: false }),
})

if (!response.ok) {
  const message = await response.text()
  throw new Error(`Supabase migration failed (${response.status}): ${message}`)
}

console.log('AI tools migration applied')

const verifyResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: `select
      (select count(*) from public.ai_tools) as tool_count,
      (select count(*) from public.ai_tool_likes) as like_count,
      (select count(*) from public.ai_tool_reviews) as review_count,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'battles' and column_name = 'ai_tool_id'
      ) as battle_tool_column;`,
    read_only: true,
  }),
})

if (!verifyResponse.ok) {
  throw new Error(`Supabase verification failed (${verifyResponse.status})`)
}

const verification = await verifyResponse.json()
console.log('Verification:', JSON.stringify(verification))
