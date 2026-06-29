import type { StopReason } from '@/stores/chat'

export function stopReasonMessage(reason: StopReason): string {
  if (reason === 'idle_early') {
    return '回复可能不完整：会话空闲超时，模型可能仍在后台运行。可在 Trace 查看完整过程。'
  }
  if (reason === 'timeout') return '等待超时（120s），已显示目前已生成内容。'
  if (reason === 'aborted') return '已手动停止。'
  if (reason === 'error') return '回复异常结束。'
  return '回复可能不完整。'
}
