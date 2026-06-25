export type StepCls = 'think' | 'tool' | 'output'

export interface TraceStep {
  key: string
  num: number
  cls: StepCls
  tag: string
  title: string
  intent?: string
  inputLine?: string
  text: string
  live: boolean
  done: boolean
  sub?: string
  subOk?: boolean
}

export interface TraceTurn {
  id: string
  question: string
  time: string
  active: boolean
  done: boolean
  steps: TraceStep[]
}

export interface TraceSession {
  id: string
  title: string
  shortId: string
  turns: number
  createdAt: number
  updatedAt: number
  loaded: boolean
  timeline: TraceTurn[]
}

export interface SessionMapEntry {
  sessionId: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface TimelineSnapshot {
  session: string
  turns: Array<{ question: string; done: boolean }>
}

export type MimoBusEvent = {
  type?: string
  properties?: Record<string, unknown>
}

export type SessionMessage = {
  info?: { role?: string; id?: string; sessionID?: string; parts?: Array<{ type?: string; text?: string }>; content?: string; text?: string }
  parts?: Array<{ type?: string; text?: string; id?: string; tool?: string; callID?: string; state?: Record<string, unknown>; time?: { end?: number } }>
}
