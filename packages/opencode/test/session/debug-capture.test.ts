import { expect, test } from "bun:test"
import { DebugCapture } from "../../src/session/debug-capture"
import { MessageID, SessionID } from "../../src/session/schema"

const sessionA = SessionID.make("ses_test_a")
const sessionB = SessionID.make("ses_test_b")
const msg1 = MessageID.make("msg_test_1")
const msg2 = MessageID.make("msg_test_2")

const payload = {
  system: ["sys"],
  tools: ["read"],
  additions: ["add"],
  instructionPaths: ["/AGENTS.md"],
  messageCount: 3,
}

test("capture and get by messageID", () => {
  DebugCapture.clearForTests()
  DebugCapture.capture(sessionA, msg1, payload)
  const hit = DebugCapture.get(sessionA, msg1)
  expect(hit?.system).toEqual(["sys"])
  expect(hit?.messageCount).toBe(3)
  expect(hit?.capturedAt).toBeGreaterThan(0)
})

test("get without messageID returns latest snapshot", () => {
  DebugCapture.clearForTests()
  DebugCapture.capture(sessionA, msg1, payload)
  DebugCapture.capture(sessionA, msg2, { ...payload, messageCount: 5 })
  const latest = DebugCapture.get(sessionA)
  expect(latest?.messageCount).toBe(5)
})

test("LRU evicts oldest session after limit", () => {
  DebugCapture.clearForTests()
  for (let i = 0; i < 51; i++) {
    const sid = SessionID.make(`ses_lru_${i}`)
    DebugCapture.capture(sid, MessageID.make(`msg_lru_${i}`), payload)
  }
  expect(DebugCapture.get(SessionID.make("ses_lru_0"))).toBeUndefined()
  expect(DebugCapture.get(SessionID.make("ses_lru_50"))?.system).toEqual(["sys"])
})

test("per-session message cap keeps latest entries", () => {
  DebugCapture.clearForTests()
  const sid = SessionID.make("ses_cap")
  for (let i = 0; i < 12; i++) {
    DebugCapture.capture(sid, MessageID.make(`msg_cap_${i}`), { ...payload, messageCount: i })
  }
  expect(DebugCapture.get(sid, MessageID.make("msg_cap_0"))).toBeUndefined()
  expect(DebugCapture.get(sid, MessageID.make("msg_cap_1"))).toBeUndefined()
  expect(DebugCapture.get(sid, MessageID.make("msg_cap_11"))?.messageCount).toBe(11)
})
