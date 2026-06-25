import { createTraceEngine } from '../src/trace/traceEngine.ts'

const engine = createTraceEngine(() => '.')
const snapshot = engine.runSimulation()

const errors: string[] = []

if (!snapshot.length) errors.push('无 session 块')
else {
  const block = snapshot[0]
  if (block.session !== 'ses_sim001') errors.push(`session 不匹配: ${block.session}`)
  if (block.turns.length !== 1) errors.push(`应只有 1 轮，实际 ${block.turns.length}`)
  else {
    const turn = block.turns[0]
    if (!turn.question.includes('当前目录有哪些文件')) errors.push(`问题不匹配: "${turn.question}"`)
    if (!turn.done) errors.push('未标记本轮完成')
  }
}

const ses = engine.getSession('ses_sim001')
const turn = ses.timeline[0]
const toolStep = turn?.steps.find((s) => s.cls === 'tool')
const listing = toolStep?.text ?? ''
if (!toolStep?.title.includes('read')) errors.push('工具应为 read 列目录')
if (!listing.includes('packages')) errors.push('目录 listing 未格式化展示')

console.log('=== Trace 模拟输出 ===')
console.log(JSON.stringify(snapshot, null, 2))

if (errors.length) {
  console.error('❌ 验证失败:')
  for (const e of errors) console.error('  -', e)
  process.exit(1)
}

console.log('✅ 验证通过：按 session 分组 · read 目录 listing · 文字输出')
