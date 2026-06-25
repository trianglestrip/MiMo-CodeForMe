import { normPath } from './utils'

export interface ToolDisplay {
  title: string
  intent: string
  inputLine: string
  sub: string
  ok?: boolean
  text: string
}

function parseReadDirectoryOutput(out: unknown) {
  if (typeof out !== 'string' || !out.includes('<entries>')) return null
  const typeMatch = out.match(/<type>([^<]+)<\/type>/)
  if (typeMatch?.[1] !== 'directory') return null
  const pathMatch = out.match(/<path>([^<]+)<\/path>/)
  const entriesBlock = out.match(/<entries>\s*([\s\S]*?)\s*<\/entries>/)
  const entries = entriesBlock ? entriesBlock[1].trim().split(/\s+/).filter(Boolean) : []
  const dirs = entries.filter((e) => e.endsWith('/'))
  const files = entries.filter((e) => !e.endsWith('/'))
  const lines = [`路径: ${pathMatch?.[1] || '?'}`, '']
  if (dirs.length) {
    lines.push('子目录:')
    for (const d of dirs.slice(0, 30)) lines.push(`  📁 ${d}`)
    if (dirs.length > 30) lines.push(`  … 共 ${dirs.length} 个目录`)
  }
  if (files.length) {
    lines.push('', '文件:')
    for (const f of files.slice(0, 24)) lines.push(`  📄 ${f}`)
    if (files.length > 24) lines.push(`  … 共 ${files.length} 个文件`)
  }
  return {
    sub: `listing 完成：${dirs.length} 个子目录，${files.length} 个文件`,
    text: lines.join('\n'),
    ok: true as const,
  }
}

export function formatToolDisplay(
  tool: string,
  input: Record<string, unknown> | undefined,
  state: Record<string, unknown>,
  workDir: string,
): ToolDisplay {
  const inp = input || {}
  let title = tool
  let intent = ''
  let inputLine = ''

  if (tool === 'read') {
    const path = normPath(inp.path ?? inp.filePath ?? inp.file ?? '.')
    const abs = path === '.' || path === './'
    title = abs ? 'read · 列出工作区根目录' : `read · ${path}`
    intent = 'Agent 用 read 读取目录 listing（工作区由 Web 的 directory 参数指定，不是猜路径）'
    inputLine = `path = ${path}\nworkDir = ${workDir || '(未配置)'}`
  } else if (tool === 'glob') {
    const pattern = inp.pattern ?? '*'
    const path = normPath(inp.path ?? '.')
    title = `glob · ${pattern} @ ${path}`
    intent = 'Agent 用 glob 按通配符匹配文件名'
    inputLine = `pattern = ${pattern}\npath = ${path}`
  } else if (tool === 'bash') {
    const cmd = String(inp.command ?? '').split('\n')[0].slice(0, 100)
    title = `bash · ${cmd || '(命令)'}`
    intent = 'Agent 在 shell 中执行命令（如 ls / dir）'
    inputLine = String(inp.command ?? '')
  } else if (tool === 'grep') {
    title = `grep · ${inp.pattern ?? '?'}`
    intent = 'Agent 在文件中搜索匹配内容'
    inputLine = JSON.stringify(inp, null, 2)
  } else if (tool === 'write' || tool === 'edit') {
    title = `${tool} · ${normPath(inp.path ?? '?')}`
    intent = 'Agent 写入/编辑文件'
    inputLine = `path = ${inp.path ?? '?'}`
  } else {
    title = tool
    inputLine = JSON.stringify(inp, null, 2).slice(0, 300)
  }

  const result: ToolDisplay = { title, intent, inputLine, sub: '执行中…', text: '' }
  if (state.error) {
    result.sub = `失败: ${String(state.error).slice(0, 160)}`
    result.ok = false
    return result
  }
  const out = state.output
  const readDir = tool === 'read' ? parseReadDirectoryOutput(out) : null
  if (readDir) return { title, intent, inputLine, ...readDir }
  if (typeof out === 'string' && out.trim()) {
    result.sub = out.includes('<entries>') ? '返回目录/文件 listing' : '返回文本'
    result.text = out.length > 800 ? `${out.slice(0, 800)}\n…` : out
    result.ok = true
  } else if (out != null) {
    const s = JSON.stringify(out, null, 2)
    result.sub = '返回 JSON'
    result.text = s.length > 600 ? `${s.slice(0, 600)}…` : s
    result.ok = true
  } else if (state.status === 'completed') {
    result.sub = '已完成（无输出）'
    result.ok = true
  }
  return result
}
