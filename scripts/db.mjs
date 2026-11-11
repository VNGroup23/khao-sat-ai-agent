// Small database helper for setup tasks. Reads credentials from .env.local.
//   node scripts/db.mjs ping
//   node scripts/db.mjs apply supabase/schema.sql
//   node scripts/db.mjs sql "select count(*) from survey.responses"
//   node scripts/db.mjs set-admin-key            (uses SURVEY_ADMIN_KEY from .env.local)
//   node scripts/db.mjs set-admin-key <key>
//   node scripts/db.mjs add-survey <id> "<title>"
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import pg from 'pg'

export const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

function candidates() {
  if (env.DATABASE_URL) return [env.DATABASE_URL]
  const ref = env.SUPABASE_REF
  const pass = env.DB_PASSWORD_ENC
  return [
    `postgresql://postgres:${pass}@db.${ref}.supabase.co:5432/postgres`,
    ...['aws-1', 'aws-0'].map((c) => `postgresql://postgres.${ref}:${pass}@${c}-ap-southeast-1.pooler.supabase.com:5432/postgres`),
  ]
}

export async function connect() {
  for (const url of candidates()) {
    const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 6000 })
    try {
      await client.connect()
      return { client, host: new URL(url).host }
    } catch (e) {
      await client.end().catch(() => {})
      if (process.env.DEBUG) console.error(new URL(url).host, '→', e.message)
    }
  }
  throw new Error('Could not connect to the database (set DEBUG=1 for details)')
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, arg, arg2] = process.argv.slice(2)
  const { client, host } = await connect()
  try {
    if (cmd === 'ping') {
      const { rows } = await client.query('select version()')
      console.log('connected via', host, rows[0].version)
    } else if (cmd === 'apply') {
      await client.query(readFileSync(arg, 'utf8'))
      console.log('applied', arg)
    } else if (cmd === 'sql') {
      const res = await client.query(arg)
      console.log(JSON.stringify(res.rows ?? res, null, 2))
    } else if (cmd === 'set-admin-key') {
      const key = arg ?? env.SURVEY_ADMIN_KEY
      if (!key) throw new Error('No key given and SURVEY_ADMIN_KEY is not set')
      await client.query("update survey.config set admin_key_hash = extensions.crypt($1, extensions.gen_salt('bf')) where id = 1", [key])
      console.log('admin key updated')
    } else if (cmd === 'add-survey') {
      await client.query('insert into survey.surveys (id, title) values ($1, $2) on conflict (id) do update set title = excluded.title', [arg, arg2])
      console.log('survey', arg, 'ready')
    } else {
      console.log('unknown command')
    }
  } finally {
    await client.end()
  }
}
