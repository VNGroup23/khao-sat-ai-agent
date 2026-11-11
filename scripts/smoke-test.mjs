// Checks the survey_* database API the way the public page reaches it (as role anon).
// Everything runs inside one transaction that is rolled back, so it leaves no data behind
// and is safe to run at any time, even while the survey is live.
//   node scripts/smoke-test.mjs
import { randomUUID } from 'node:crypto'
import { connect, env } from './db.mjs'

const { client } = await connect()
const SURVEY = 'ai-agent-2026'
let failed = 0
const check = (ok, label) => {
  console.log(ok ? '  ✓' : '  ✗', label)
  if (!ok) failed++
}
// On failure the role is not reset here: the caller rolls back to its savepoint, which
// also undoes the SET LOCAL.
const asAnon = async (sql, params) => {
  await client.query('set local role anon')
  const row = (await client.query(sql, params)).rows[0]
  await client.query('reset role')
  return row
}
const expectError = async (sql, params, code) => {
  await client.query('savepoint s')
  try {
    await asAnon(sql, params)
    await client.query('release savepoint s')
    return false
  } catch (e) {
    await client.query('rollback to savepoint s')
    return code ? e.message.includes(code) : true
  }
}

try {
  await client.query('begin')
  // Make sure the survey is open inside this transaction, whatever its live state.
  await client.query('update survey.surveys set is_open = true where id = $1', [SURVEY])

  const st = (await asAnon('select public.survey_status($1) as s', [SURVEY])).s
  check(st.exists && st.open, 'survey_status reports the survey as open')

  const rid = randomUUID()
  const info = { name: 'Smoke Test', unit: '  VNGLand  ', dept: 'GPCN', role: 'Tester', date: '2026-11-11' }
  const answers = { q1: { question: 'Câu 1', chips: ['🚀 Hàng ngày, đã thành thói quen làm việc'], other: '' } }
  const args = [SURVEY, rid, info, answers, 'smoke-test']
  const sql = 'select public.survey_submit($1, $2, $3, $4, $5) as r'
  const r1 = (await asAnon(sql, args)).r
  const r2 = (await asAnon(sql, args)).r
  check(r1.count === 1 && r2.count === 2, 'sending twice from one respondent updates the same row')

  const row = (await client.query('select unit, survey_date from survey.responses where respondent = $1', [rid])).rows[0]
  check(row?.unit === 'VNGLand' && row?.survey_date === '2026-11-11', 'text fields are trimmed and stored')

  check(await expectError('select count(*) from survey.responses', [], 'permission denied'), 'anon cannot read the responses table')
  check(await expectError('select survey.admin_ok($1)', ['x'], 'permission denied'), 'anon cannot call internal helpers')
  check(await expectError('select public.survey_submit($1, $2, $3, $4, $5)', [SURVEY, rid, info, '[]', ''], 'BAD_INPUT'), 'malformed answers are rejected')

  const bad = (await asAnon('select public.survey_admin_check($1) as ok', ['wrong-key'])).ok
  check(bad === false, 'wrong admin key is refused')
  check(await expectError('select public.survey_admin_list($1, $2)', ['wrong-key', SURVEY], 'FORBIDDEN'), 'admin list needs the key')

  if (env.SURVEY_ADMIN_KEY) {
    const ok = (await asAnon('select public.survey_admin_check($1) as ok', [env.SURVEY_ADMIN_KEY])).ok
    check(ok === true, 'SURVEY_ADMIN_KEY from .env.local unlocks the admin page')
    const list = (await asAnon('select public.survey_admin_list($1, $2) as l', [env.SURVEY_ADMIN_KEY, SURVEY])).l
    check(list.responses.some((x) => x.name === 'Smoke Test'), 'admin list includes the new response')
  }

  await client.query('update survey.surveys set is_open = false where id = $1', [SURVEY])
  check(await expectError(sql, [SURVEY, randomUUID(), info, answers, ''], 'CLOSED'), 'a closed survey refuses new submissions')
} finally {
  await client.query('rollback')
  await client.end()
}
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed (rolled back, nothing saved)')
process.exit(failed ? 1 : 0)
