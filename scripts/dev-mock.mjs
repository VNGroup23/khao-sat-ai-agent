// Local preview with an in-memory fake of the survey_* database functions, so the pages
// can be tried without touching Supabase. Admin password: "test".
//   node scripts/dev-mock.mjs [--port 5180] [--seed 25]
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const arg = (name, def) => {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : def
}
const PORT = Number(arg('--port', 5180))
const SEED = Number(arg('--seed', 0))
const ADMIN_KEY = 'test'

const surveys = new Map([['ai-agent-2026', { id: 'ai-agent-2026', title: 'Khảo Sát Thực Trạng Sử Dụng AI Agent', isOpen: true }]])
const responses = new Map() // `${survey}:${respondent}` -> row

class Fail extends Error {}
const clean = (s, max = 200) => (String(s ?? '').trim().slice(0, max) || null)

const rpc = {
  survey_status: ({ p_survey }) => {
    const s = surveys.get(p_survey)
    return { exists: !!s, open: !!s?.isOpen, title: s?.title ?? null }
  },
  survey_submit: ({ p_survey, p_respondent, p_info, p_answers, p_user_agent }) => {
    if (!p_respondent || typeof p_answers !== 'object' || !p_answers) throw new Fail('BAD_INPUT')
    if (JSON.stringify(p_answers).length > 100000) throw new Fail('TOO_LARGE')
    if (!surveys.get(p_survey)?.isOpen) throw new Fail('CLOSED')
    const k = `${p_survey}:${p_respondent}`
    const now = new Date().toISOString()
    const old = responses.get(k)
    const info = p_info || {}
    const row = {
      id: old?.id ?? randomUUID(),
      survey: p_survey,
      name: clean(info.name), unit: clean(info.unit), dept: clean(info.dept), role: clean(info.role), date: clean(info.date, 10),
      answers: p_answers, userAgent: clean(p_user_agent, 400),
      submittedAt: old?.submittedAt ?? now, updatedAt: now, count: (old?.count ?? 0) + 1,
    }
    responses.set(k, row)
    return { submittedAt: row.submittedAt, updatedAt: row.updatedAt, count: row.count }
  },
  survey_admin_check: ({ p_key }) => p_key === ADMIN_KEY,
  survey_admin_list: ({ p_key, p_survey }) => {
    if (p_key !== ADMIN_KEY) throw new Fail('FORBIDDEN')
    const list = [...responses.values()].filter((r) => r.survey === p_survey).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    return { survey: surveys.get(p_survey) ?? null, responses: list.map(({ survey, ...r }) => r) }
  },
  survey_admin_set_open: ({ p_key, p_survey, p_open }) => {
    if (p_key !== ADMIN_KEY) throw new Fail('FORBIDDEN')
    surveys.get(p_survey).isOpen = !!p_open
    return !!p_open
  },
  survey_admin_delete: ({ p_key, p_id }) => {
    if (p_key !== ADMIN_KEY) throw new Fail('FORBIDDEN')
    for (const [k, r] of responses) if (r.id === p_id) responses.delete(k)
    return null
  },
}

// Fake answers drawn from the real question config, for checking the admin page.
async function seed(n) {
  const src = await readFile(join(ROOT, 'config.js'), 'utf8')
  const QUESTIONS = new Function(`${src}; return QUESTIONS`)()
  const units = ['VNGLand', 'Kite Coffee', 'Hội sở (HO)', 'VNG Land', 'Sứ Retreat', '']
  const depts = ['Kế toán', 'Nhân sự', 'Kinh doanh', 'Pháp chế', 'Marketing', '']
  const names = ['Nguyễn V.A', 'Trần Thị B', 'Lê C', '', 'Phạm D', 'Hoàng E']
  const pick = (a) => a[Math.floor(Math.random() * a.length)]
  for (let i = 0; i < n; i++) {
    const answers = {}
    for (const q of QUESTIONS.filter((q) => q.id !== 'info')) {
      const k = q.single ? 1 : Math.min(q.max ?? 9, 1 + Math.floor(Math.random() * 4))
      const chips = [...q.chips].sort(() => Math.random() - 0.5).slice(0, Math.random() < 0.1 ? 0 : k)
      const a = { question: q.title, chips }
      if (q.type === 'chips+text') a.text = Math.random() < 0.5 ? `Ví dụ mô tả số ${i + 1} cho ${q.num}: tổng hợp báo cáo tuần từ Google Sheets.` : ''
      else a.other = Math.random() < 0.15 ? `Ý kiến thêm ${i + 1}` : ''
      answers[q.id] = a
    }
    rpc.survey_submit({
      p_survey: 'ai-agent-2026', p_respondent: randomUUID(),
      p_info: { name: pick(names), unit: pick(units), dept: pick(depts), role: pick(['Chuyên viên', 'Trưởng phòng', '']), date: '2026-11-11' },
      p_answers: answers, p_user_agent: 'seed',
    })
  }
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' }
const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' })
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const m = url.pathname.match(/^\/mock\/rest\/v1\/rpc\/(\w+)$/)
  if (m) {
    let raw = ''
    for await (const c of req) raw += c
    const fn = rpc[m[1]]
    if (!fn) return send(res, 404, { message: 'not found' })
    await new Promise((r) => setTimeout(r, 250)) // feel the latency
    try {
      return send(res, 200, fn(JSON.parse(raw || '{}')) ?? null)
    } catch (e) {
      return send(res, e instanceof Fail ? 400 : 500, { message: e.message })
    }
  }
  const path = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, '')
  try {
    let body = await readFile(join(ROOT, path))
    if (path === '/config.js') {
      body = body.toString().replace(/url:\s*"[^"]*"/, `url: "http://${req.headers.host}/mock"`).replace(/key:\s*"[^"]*"/, 'key: "mock"')
    }
    send(res, 200, body, TYPES[extname(path)] ?? 'application/octet-stream')
  } catch {
    send(res, 404, 'Not found', 'text/plain')
  }
}).listen(PORT, async () => {
  if (SEED) await seed(SEED)
  console.log(`Survey:  http://localhost:${PORT}/\nAdmin:   http://localhost:${PORT}/admin.html  (password: ${ADMIN_KEY})${SEED ? `\nSeeded ${SEED} fake responses` : ''}`)
})
