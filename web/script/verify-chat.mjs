const cfg = {
  baseUrl: 'http://127.0.0.1:4096',
  user: 'mimocode',
  pass: 'mimocode-standalone',
  dir: 'd:/gitProject/testCAD/portable/MiMo-CodeForMe',
}
const auth = 'Basic ' + Buffer.from(`${cfg.user}:${cfg.pass}`).toString('base64')
const q = (p) => {
  const u = new URL(cfg.baseUrl.replace(/\/$/, '') + p)
  u.searchParams.set('directory', cfg.dir)
  return u.toString()
}

const question = '帮我查看当前目录有哪些文件，只列几个主要目录名即可'

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
  let finalText = ''
  const textParts = new Set()
  const ac = new AbortController()

  const stream = (async () => {
    const res = await fetch(q('/event'), {
      headers: { Authorization: auth, Accept: 'text/event-stream' },
      signal: ac.signal,
    })
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const blocks = buf.split('\n\n')
      buf = blocks.pop() || ''
      for (const block of blocks) {
        const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trimStart()).join('\n')
        if (!data) continue
        try {
          const raw = JSON.parse(data)
          if (raw.type === 'message.part.delta') {
            const p = raw.properties || {}
            if (p.field === 'text' && textParts.has(p.partID)) finalText += p.delta
          }
          if (raw.type === 'message.part.updated') {
            const part = raw.properties?.part || {}
            if (part.type === 'text') {
              if (part.id) textParts.add(part.id)
              if (part.text) finalText = part.text
            }
          }
        } catch (_) {}
      }
    }
  })()

  console.log('[chat] 创建 session 并提问…')
  const session = await fetch(q('/session'), {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: '{}',
  }).then((r) => r.json())

  await fetch(q(`/session/${encodeURIComponent(session.id)}/prompt_async`), {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ parts: [{ type: 'text', text: question }] }),
  })

  await waitForSessionIdle(session.id)
  await new Promise((r) => setTimeout(r, 800))
  ac.abort()
  await stream.catch(() => {})

  if (!finalText.trim()) {
    const messages = await fetch(q(`/session/${encodeURIComponent(session.id)}/message`), {
      headers: { Authorization: auth },
    }).then((r) => r.json())
    finalText = lastAssistantText(messages)
  }

  console.log('\n=== 问答验证 ===')
  console.log('问:', question)
  console.log('答:', finalText.slice(0, 400) || '(空)')
  console.log('字数:', finalText.length)

  const ok = finalText.length > 20
  console.log(ok ? '\n✅ 问答：收到助手回复' : '\n❌ 问答：回复为空')
  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
