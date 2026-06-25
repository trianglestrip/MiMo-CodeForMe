import type { ActivityPhase } from '@/lib/partPhase'

export type PhaseCls = ActivityPhase

/** Font Awesome 7 Free 空心（regular）图标 */
const R = 'fa-regular'

export function phaseIconClass(cls: PhaseCls): string {
  if (cls === 'think') return `${R} fa-lightbulb`
  if (cls === 'tool') return `${R} fa-clipboard`
  if (cls === 'output') return `${R} fa-pen-to-square`
  if (cls === 'step') return `${R} fa-hourglass`
  if (cls === 'file') return `${R} fa-paperclip`
  if (cls === 'delegate') return `${R} fa-user`
  return `${R} fa-circle`
}

export function toolStatusIconClass(status: 'done' | 'error' | 'running'): string | null {
  if (status === 'error') return `${R} fa-circle-xmark`
  if (status === 'done') return `${R} fa-circle-check`
  return null
}

export function phaseTagIconClass(cls: PhaseCls): string {
  if (cls === 'output') return `${R} fa-file-lines`
  return phaseIconClass(cls)
}

export function flowArrowIconClass(): string {
  return `${R} fa-arrow-right`
}

export function flowEndIconClass(): string {
  return `${R} fa-circle-check`
}
