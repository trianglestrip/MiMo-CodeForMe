import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { JSDOM } from 'jsdom'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cfg = {
  baseUrl: 'http://127.0.0.1:4096',
  username: 'mimocode',
  password: 'mimocode-standalone',
  workDir: 'd:/gitProject/testCAD/portable/MiMo-CodeForMe',
}
const auth = 'Basic ' + Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64')

function withDir(p) {
  const u = new URL(cfg.baseUrl.replace(/\/$/, '') + p)
  u.searchParams.set('directory', cfg.workDir)
  return u.toString()
}

let html = fs.readFileSync(path.join(__dirname, '../public/trace.html'), 'utf8')
html = html.replace('<script src="/mimo-config.js"></script>', `<script>window.MIMO_TRACE_CONFIG=${JSON.stringify(cfg)}</script>`)
html = html.replace(
  /if \(new URLSearchParams\(location\.search\)\.get\('simulate'\) === '1'\) \{[\s\S]*?\} else \{[\s\S]*?\}\s*<\/script>/,
  'window.__traceLiveMode = true\n  </script>',
)

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/trace.html', pretendToBeVisual: true })
const { window } = dom
window.MIMO_TRACE_CONFIG = cfg

async function collectEvents(timeoutMs = 90000) {
  const events = []
  const ac = new AbortController()
  const res = await fetch(withDir('/event'), {
    headers: { Authorization: auth, Accept: 'text/event-stream' },
    signal: ac.signal,
  })
  if (!res.ok || !res.body) throw new Error(`event stream ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const deadline = Date.now() + timeoutMs
  let idleSeen = false

  const readLoop = (async () => {
    while (Date.now() < deadline) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() || ''
      for (const block of parts) {
        const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trimStart()).join('\n')
        if (!data) continue
        try {
          const ev = JSON.parse(data)
          events.push(ev)
          window.__traceHandleEvent(ev)
          if (ev.type === 'session.status' && ev.properties?.status?.type === 'idle') idleSeen = true
        } catch (_) {}
      }
      if (idleSeen && events.length > 5) break
    }
  })()

  const sessionRes = await fetch(withDir('/session'), {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: '{}',
  })
  const session = await sessionRes.json()
  const sessionID = session.id

  await fetch(withDir(`/session/${encodeURIComponent(sessionID)}/prompt_async`), {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ parts: [{ type: 'text', text: '读取当前目录有哪些文件，只列文件名即可' }] }),
  })

  await readLoop
  ac.abort()

  return { sessionID, events, snapshot: window.__traceGetSnapshot() }
}

console.log('连接 mimo serve，发送真实 prompt…')
const { sessionID, events, snapshot } = await collectEvents()

console.log('\n=== 真实调用 Trace 输出 ===\n')
for (const turn of snapshot) {
  console.log(`问：${turn.question}${turn.done ? '  [完成]' : ''}`)
  for (const s of turn.steps) {
    console.log(`  ${s.num}. ${s.tag}  ${s.title}`)
    if (s.preview) console.log(`     ${s.preview.replace(/\n/g, ' ').slice(0, 140)}`)
    if (s.sub) console.log(`     ${s.sub}`)
  }
  console.log('')
}

const types = [...new Set(events.map((e) => e.type))]
console.log(`事件类型 (${events.length} 条):`, types.join(', '))
console.log(`session: ${sessionID}`)

const lastTurn = snapshot.find((t) => t.question.includes('读取') || t.question.includes('目录') || t.question.includes('未捕获'))
const tools = lastTurn?.steps.filter((s) => s.tag === '调用') ?? []
const ok = lastTurn && lastTurn.steps.length >= 2 && tools.length >= 1
console.log(ok ? '\n✅ 真实调用：有关键流程步骤（含工具调用）' : '\n⚠️ 真实调用：步骤不完整，请检查模型/网络')
