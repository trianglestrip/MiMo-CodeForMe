const base = 'http://127.0.0.1:5173/mimo'
const dir = 'd:/gitProject/testCAD/portable/MiMo-CodeForMe'
const auth = 'Basic ' + Buffer.from('mimocode:mimocode-standalone').toString('base64')
const q = (p) => `${base}${p}?directory=${encodeURIComponent(dir)}`

const question = process.argv[2] || '11'

async function poll(sessionID) {
  const deadline = Date.now() + 120000
  while (Date.now() < deadline) {
    const messages = await fetch(q(`/session/${sessionID}/message`), { headers: { Authorization: auth } }).then((r) => r.json())
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.info?.role !== 'assistant') continue
      const text = (msg.parts ?? []).filter((p) => p.type === 'text').map((p) => p.text).join('')
      if (text.trim()) return text
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return ''
}

const health = await fetch(`${base}/global/health`).then((r) => r.json())
console.log('[proxy] health:', health)

const session = await fetch(q('/session'), {
  method: 'POST',
  headers: { Authorization: auth, 'Content-Type': 'application/json' },
  body: '{}',
}).then((r) => r.json())

await fetch(q(`/session/${session.id}/prompt_async`), {
  method: 'POST',
  headers: { Authorization: auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ parts: [{ type: 'text', text: question }] }),
})

const answer = await poll(session.id)
console.log('问:', question)
console.log('答:', answer.slice(0, 300) || '(空)')
process.exit(answer.length > 3 ? 0 : 1)
