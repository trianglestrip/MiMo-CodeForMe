import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { JSDOM } from 'jsdom'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const htmlPath = path.join(__dirname, '../public/trace.html')
let html = fs.readFileSync(htmlPath, 'utf8')
html = html.replace('<script src="/mimo-config.js"></script>', '<script>window.MIMO_TRACE_CONFIG={baseUrl:"http://127.0.0.1:4096",workDir:"."}</script>')

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'http://localhost/trace.html?simulate=1',
  pretendToBeVisual: true,
})

const { window } = dom
window.MIMO_TRACE_CONFIG = { baseUrl: 'http://127.0.0.1:4096', workDir: '.' }

const snapshot = typeof window.__traceRunSimulation === 'function'
  ? window.__traceRunSimulation()
  : []
const errors = []

if (!snapshot?.length) errors.push('无 session 块')
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

const toolStep = window.document.querySelector('.step-tool .step-head-text')?.textContent ?? ''
const listing = window.document.querySelector('.step-tool .step-preview')?.textContent ?? ''
if (!toolStep.includes('read')) errors.push('工具应为 read 列目录')
if (!listing.includes('packages')) errors.push('目录 listing 未格式化展示')

console.log('=== Trace 模拟输出 ===')
console.log(JSON.stringify(snapshot, null, 2))

if (errors.length) {
  console.error('❌ 验证失败:')
  for (const e of errors) console.error('  -', e)
  process.exit(1)
}

console.log('✅ 验证通过：按 session 分组 · read 目录 listing · 文字输出')
