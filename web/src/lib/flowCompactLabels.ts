import type { MermaidFlowShape } from '@/lib/mermaidShapes'

/** 窄节点 / 菱形等：固定两行短标签 */
export function flowCompactLines(
  shape: MermaidFlowShape,
  key: string,
  label: string,
): [string, string] {
  if (shape === 'stadium') {
    if (key.startsWith('step-start:') || label.includes('开始')) return ['推理', '开始']
    if (key.startsWith('step-finish:') || label.includes('完成')) return ['推理', '完成']
    return ['流程', '完成']
  }
  if (shape === 'rhombus') {
    if (label.includes('重试')) return ['API', '重试']
    return ['判断', '分支']
  }
  if (shape === 'hexagon') return ['上下文', '压缩']
  if (shape === 'circle') return ['会话', '检查点']
  return ['节点', '…']
}
