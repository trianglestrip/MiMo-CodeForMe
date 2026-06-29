export interface SlashCommand {
  name: string
  label: string
  description: string
  messageTemplate?: string
}

/** 解析输入框末尾的 /命令 片段，用于联想提示 */
export function parseSlashQuery(text: string): string | null {
  const m = text.match(/(?:^|\n)\/([\w-]*)$/)
  return m ? m[1] : null
}

export function filterSlashCommands(commands: SlashCommand[], query: string): SlashCommand[] {
  const q = query.toLowerCase()
  return commands.filter(
    c => c.name.toLowerCase().startsWith(q) || c.label.toLowerCase().includes(q),
  )
}

/** 发送前：按当前模型配置的 slashCommands 解析 /name 正文 */
export function resolveSlashMessage(raw: string, commands: SlashCommand[]): string {
  const trimmed = raw.trim()
  const m = trimmed.match(/^\/([\w-]+)(?:\s+([\s\S]*))?$/)
  if (!m) return raw

  const [, name, rest = ''] = m
  const cmd = commands.find(c => c.name.toLowerCase() === name.toLowerCase())
  if (!cmd?.messageTemplate) return raw

  const body = rest.trim()
  if (!body) return cmd.messageTemplate.replace('{input}', '').replace(/：\s*$/, '。')
  return cmd.messageTemplate.replace('{input}', body)
}

export function insertSlashCommand(text: string, commandName: string): string {
  return text.replace(/(?:^|\n)\/[\w-]*$/, m => {
    const lead = m.startsWith('\n') ? '\n' : ''
    return `${lead}/${commandName} `
  })
}
