import type { ActivityPhase } from '@/lib/partPhase'

/** Mermaid flowchart 节点外形（与官方语法一一对应） */
export type MermaidFlowShape =
  | 'rect'              // [text]
  | 'rounded'           // (text)
  | 'stadium'           // ([text])
  | 'subroutine'        // [[text]]
  | 'cylinder'          // [(text)]
  | 'circle'            // ((text))
  | 'asymmetric'        // >text]
  | 'rhombus'           // {text}
  | 'hexagon'           // {{text}}
  | 'parallelogram'     // [/text/]
  | 'parallelogram-alt' // [\text\]
  | 'trapezoid'         // [/text\]
  | 'trapezoid-alt'     // [\\text//]

export function mermaidShapeClass(shape: MermaidFlowShape): string {
  return `shape-${shape}`
}

export function isCompactMermaidShape(shape: MermaidFlowShape): boolean {
  return shape === 'stadium' || shape === 'rhombus'
}

function isStepStart(key?: string, label?: string) {
  return key?.startsWith('step-start:') || label?.includes('开始') === true
}

function isStepFinish(key?: string, label?: string) {
  return key?.startsWith('step-finish:') || label?.includes('轮次完成') === true
}

/** 工具调用：统一子流程外形 */
function toolMermaidShape(_label?: string): MermaidFlowShape {
  return 'subroutine'
}

/** 按阶段与 part key 映射 Mermaid 外形（尽量每种消息不同形） */
export function flowMermaidShape(
  phase: ActivityPhase,
  key?: string,
  label?: string,
): MermaidFlowShape {
  if (phase === 'step') {
    if (isStepStart(key, label)) return 'stadium'
    if (isStepFinish(key, label)) return 'stadium'
    return 'rounded'
  }
  if (phase === 'think') return 'rounded'
  if (phase === 'tool') return toolMermaidShape(label)
  if (phase === 'output') return 'parallelogram'
  if (phase === 'file') {
    if (key?.startsWith('snapshot:')) return 'cylinder'
    if (key?.startsWith('patch:')) return 'rounded'
    if (key?.startsWith('file:')) return 'asymmetric'
    return 'trapezoid'
  }
  if (phase === 'delegate') {
    if (key?.startsWith('subtask:')) return 'parallelogram-alt'
    return 'subroutine'
  }
  if (phase === 'system') {
    if (key?.startsWith('retry:') || label?.includes('重试')) return 'rhombus'
    if (key?.startsWith('compaction:')) return 'trapezoid-alt'
    if (key?.startsWith('checkpoint:')) return 'rounded'
    return 'rounded'
  }
  return 'rect'
}

export const MERMAID_SHAPE_LABELS: Record<MermaidFlowShape, string> = {
  rect: '矩形',
  rounded: '圆角',
  stadium: '起止',
  subroutine: '子流程',
  cylinder: '圆柱',
  circle: '圆形',
  asymmetric: '旗形',
  rhombus: '菱形',
  hexagon: '六边形',
  parallelogram: '平行四边形',
  'parallelogram-alt': '平行四边形(反)',
  trapezoid: '梯形',
  'trapezoid-alt': '梯形(反)',
}

export const MERMAID_SHAPE_SYNTAX: Record<MermaidFlowShape, string> = {
  rect: '[text]',
  rounded: '(text)',
  stadium: '([text])',
  subroutine: '[[text]]',
  cylinder: '[(text)]',
  circle: '((text))',
  asymmetric: '>text]',
  rhombus: '{text}',
  hexagon: '{{text}}',
  parallelogram: '[/text/]',
  'parallelogram-alt': '[\\text\\]',
  trapezoid: '[/text\\]',
  'trapezoid-alt': '[\\\\text//]',
}

export const ALL_MERMAID_SHAPES = Object.keys(MERMAID_SHAPE_LABELS) as MermaidFlowShape[]
