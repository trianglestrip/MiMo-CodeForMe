import type { ActivityPhase } from '@/lib/partPhase'

export type PhaseCls = ActivityPhase

/** Font Awesome 7 Free 空心（regular）图标 */
const R = 'fa-regular'

export function phaseIconClass(cls: PhaseCls): string {
  if (cls === 'think') return `${R} fa-lightbulb`
  if (cls === 'tool') return `${R} fa-clipboard`
  if (cls === 'output') return `${R} fa-pen-to-square`
  if (cls === 'step') return `${R} fa-hourglass`
  if (cls === 'file') return `${R} fa-file`
  if (cls === 'delegate') return `${R} fa-user`
  return `${R} fa-circle`
}

/** 活动/流程节点：按 key 与 label 细分图标（FA7 regular 可用） */
export function activityIconClass(cls: PhaseCls, key?: string, label?: string): string {
  if (cls === 'file') {
    if (key?.startsWith('patch:') || label?.startsWith('变更')) return `${R} fa-file-lines`
    if (key?.startsWith('snapshot:') || label?.includes('快照')) return `${R} fa-camera`
    return `${R} fa-file`
  }
  return phaseIconClass(cls)
}

export function toolStatusIconClass(status: 'done' | 'error' | 'running'): string | null {
  if (status === 'error') return `${R} fa-circle-xmark`
  if (status === 'done') return `${R} fa-circle-check`
  return null
}

export function phaseTagIconClass(cls: PhaseCls, key?: string, title?: string): string {
  if (cls === 'output') return `${R} fa-file-lines`
  return activityIconClass(cls, key, title)
}

export function flowArrowIconClass(): string {
  return `${R} fa-arrow-right`
}

export function flowEndIconClass(): string {
  return `${R} fa-circle-check`
}
