const base = 'http://127.0.0.1:5173/mimo'
const dir = 'd:/gitProject/testCAD/portable/MiMo-CodeForMe'
const auth = 'Basic ' + Buffer.from('mimocode:mimocode-standalone').toString('base64')
const q = (p) => `${base}${p}?directory=${encodeURIComponent(dir)}`

const session = await fetch(q('/session'), {
  method: 'POST',
  headers: { Authorization: auth, 'Content-Type': 'application/json' },
  body: '{}',
}).then((r) => r.json())

await fetch(q(`/session/${session.id}/prompt_async`), {
  method: 'POST',
  headers: { Authorization: auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ parts: [{ type: 'text', text: '当前目录有哪些文件' }] }),
})

await new Promise((r) => setTimeout(r, 25000))

const messages = await fetch(q(`/session/${session.id}/message`), {
  headers: { Authorization: auth },
}).then((r) => r.json())

console.log('session:', session.id)
console.log('messages count:', messages.length)
console.log(JSON.stringify(messages, null, 2).slice(0, 4000))
