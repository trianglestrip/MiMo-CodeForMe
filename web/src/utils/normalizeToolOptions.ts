export interface OptionItem {
  id: string
  label: string
  description?: string
}

/** Normalize tool arguments to N buttons (present_options or legacy confirm_action). */
export function normalizeToolOptions(
  toolName: string,
  args: Record<string, unknown>,
): OptionItem[] {
  if (toolName === 'present_options') {
    const raw = args.options
    if (!Array.isArray(raw)) return []
    return raw
      .filter((o): o is Record<string, unknown> => o && typeof o === 'object' && 'label' in o)
      .slice(0, 5)
      .map((o, i) => ({
        id: String(o.id ?? i),
        label: String(o.label),
        description: o.description != null ? String(o.description) : undefined,
      }))
  }

  if (toolName === 'confirm_action') {
    return [
      { id: 'a', label: String(args.option_a ?? '确认') },
      { id: 'b', label: String(args.option_b ?? '取消') },
    ]
  }

  return []
}

export function getToolQuestion(toolName: string, args: Record<string, unknown>): string {
  if (toolName === 'present_options') return String(args.question ?? '')
  if (toolName === 'confirm_action') return String(args.action ?? '')
  return ''
}

export function isLegacyConfirmTool(name: string): boolean {
  return name === 'confirm_action'
}
