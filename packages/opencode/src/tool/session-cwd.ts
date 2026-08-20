import { BusEvent } from "@/bus/bus-event"
import { Instance } from "@/project/instance"
import { registerDisposer } from "@/effect/instance-registry"
import { SessionID } from "@/session/schema"
import z from "zod"

interface Entry {
  directory: string
  cwd: string
}

const store = new Map<string, Entry>()

registerDisposer(async (directory) => {
  for (const [sessionID, entry] of store) {
    if (entry.directory === directory) store.delete(sessionID)
  }
})

export const Event = {
  Changed: BusEvent.define(
    "session.cwd",
    z.object({
      sessionID: SessionID.zod,
      cwd: z.string(),
    }),
  ),
}

export function get(sessionID: SessionID): string {
  return store.get(sessionID)?.cwd ?? Instance.directory
}

/** 仅返回显式设置的 cwd 覆盖；未设置时为 undefined（区别于 get() 的 Instance.directory 回退） */
export function tryGet(sessionID: SessionID): string | undefined {
  return store.get(sessionID)?.cwd
}

export function set(sessionID: SessionID, dir: string): void {
  store.set(sessionID, { directory: Instance.directory, cwd: dir })
}

export function clear(sessionID: SessionID): void {
  store.delete(sessionID)
}

export * as SessionCwd from "./session-cwd"
