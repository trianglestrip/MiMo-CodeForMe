export function inlineSnippet(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (!flat) return ''
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}

export function thinkActivityLabel(text: string): string {
  const snippet = inlineSnippet(text)
  return snippet ? `思考中 · ${snippet}` : '思考中…'
}

export function toolActivityLabel(tool: string, input?: Record<string, unknown>): string {
  if (!input) return tool
  if (tool === 'read') {
    const path = String(input.path ?? input.filePath ?? input.file ?? '.')
    if (path === '.' || path === './') return 'read · 列出工作区目录'
    return `read · ${path.replace(/\\/g, '/').split('/').slice(-2).join('/') || path}`
  }
  if (tool === 'glob') {
    const pattern = input.pattern ?? '*'
    const path = input.path ?? '.'
    return `glob · ${pattern} @ ${path}`
  }
  if (tool === 'bash') {
    const cmd = String(input.command ?? '').split('\n')[0].slice(0, 60)
    return cmd ? `bash · ${cmd}` : 'bash · 执行命令'
  }
  if (tool === 'grep') return `grep · ${input.pattern ?? '?'}`
  if (tool === 'write' || tool === 'edit') return `${tool} · ${input.path ?? '?'}`
  const p = input.path ?? input.filePath ?? input.directory
  if (p) return `${tool} · ${String(p).replace(/\\/g, '/').split('/').slice(-2).join('/')}`
  return tool
}
