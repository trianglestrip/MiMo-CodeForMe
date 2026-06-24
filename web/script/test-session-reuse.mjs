const base = 'http://127.0.0.1:5173/mimo'
const dir = 'd:/gitProject/testCAD/portable/MiMo-CodeForMe'
const auth = 'Basic ' + Buffer.from('mimocode:mimocode-standalone').toString('base64')
const q = (p) => `${base}${p}?directory=${encodeURIComponent(dir)}`

function lastAssistantText(messages) {
  let lastUserIdx = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].info?.role === 'user') {
      lastUserIdx = i
      break
    }
  }
  for (let i = messages.length - 1; i > lastUserIdx; i--) {
    const msg = messages[i]
    if (msg.info?.role !== 'assistant') continue
    const text = (msg.parts ?? []).filter((p) => p.type === 'text').map((p) => p.text).join('')
    if (text.trim()) return text
  }
  return ''
}

async function poll(sessionID, idleExitMs = 3000) {
  const deadline = Date.now() + 60000
  let sawBusy = false
  let idleSince = 0
  while (Date.now() < deadline) {
    const messages = await fetch(q(`/session/${sessionID}/message`), { headers: { Authorization: auth } }).then((r) => r.json())
    const text = lastAssistantText(messages)
    if (text.trim()) return { text, reason: 'got text' }

    const statuses = await fetch(q('/session/status'), { headers: { Authorization: auth } }).then((r) => r.json())
    const st = statuses[sessionID]
    if (st?.type === 'busy') {
      sawBusy = true
      idleSince = 0
    }
    if (st?.type === 'idle' || st?.type === 'completed' || (sawBusy && !st)) {
      idleSince ||= Date.now()
      if (Date.now() - idleSince > idleExitMs) return { text: '', reason: `idle ${idleExitMs}ms no text, msgs=${messages.length}` }
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return { text: '', reason: 'timeout' }
}

const session = await fetch(q('/session'), {
  method: 'POST',
  headers: { Authorization: auth, 'Content-Type': 'application/json' },
  body: '{}',
}).then((r) => r.json())

for (const msg of ['hello', '111']) {
  console.log('\n--- send:', msg)
  await fetch(q(`/session/${session.id}/prompt_async`), {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ parts: [{ type: 'text', text: msg }] }),
  })
  const r = await poll(session.id)
  console.log('result:', r)
}
