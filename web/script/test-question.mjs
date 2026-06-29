const cfg = {
  baseUrl: 'http://127.0.0.1:9000',
  user: 'mimocode',
  pass: 'mimocode-standalone',
  dir: 'd:/gitProject/testCAD/portable/MiMo-CodeForMe',
}
const auth = 'Basic ' + Buffer.from(`${cfg.user}:${cfg.pass}`).toString('base64')
const question = process.argv[2] || '当前文件夹有什么文件'

const q = (p) => {
  const u = new URL(cfg.baseUrl.replace(/\/$/, '') + p)
  u.searchParams.set('directory', cfg.dir)
  return u.toString()
}

async function waitForSessionIdle(sessionID) {
  const deadline = Date.now() + 120000
  let sawBusy = false
  while (Date.now() < deadline) {
    const statuses = await fetch(q('/session/status'), { headers: { Authorization: auth } }).then((r) => r.json())
    const st = statuses[sessionID]
    if (st?.type === 'busy') sawBusy = true
    if (st?.type === 'idle' || st?.type === 'completed') return
    if (sawBusy && !st) return
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('session idle timeout')
}

function lastAssistantText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.info?.role !== 'assistant') continue
    const text = (msg.parts ?? [])
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('')
    if (text.trim()) return text
  }
  return ''
}

async function main() {
  console.log('[test] 问:', question)
  const session = await fetch(q('/session'), {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: '{}',
  }).then((r) => r.json())
  console.log('[test] session:', session.id)

  await fetch(q(`/session/${encodeURIComponent(session.id)}/prompt_async`), {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ parts: [{ type: 'text', text: question }] }),
  })

  await waitForSessionIdle(session.id)
  await new Promise((r) => setTimeout(r, 800))

  const messages = await fetch(q(`/session/${encodeURIComponent(session.id)}/message`), {
    headers: { Authorization: auth },
  }).then((r) => r.json())

  const answer = lastAssistantText(messages)
  console.log('答:', answer.slice(0, 600) || '(空)')
  console.log('字数:', answer.length)
  console.log('消息数:', messages.length)
  process.exit(answer.length > 5 ? 0 : 1)
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
