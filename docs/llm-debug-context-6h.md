# 最近 6 小时内：LLM 上下文调试相关变更

> 时间范围：2026-06-29 约 13:14–19:14（+0800）  
> 涉及提交：`5b0a0542`（其余两笔提交与 LLM 上下文无关）

## 概述

在 `5b0a0542`（`feat: debug-capture, dual-model distWebServer, and web MiMo alignment`）中，新增了**在每次调用 LLM 前捕获请求前缀快照**，并通过 HTTP API 暴露，便于调试「模型实际收到了什么」。

整体链路：

```
用户发消息 → prompt runLoop 构建 LLM 请求前缀
           → DebugCapture.capture() 写入内存
           → GET /session/:id/debug-context
           → 返回 System / Tools / Additions 等快照
```

---

## 后端（packages/opencode）

### 1. 新增 `debug-capture.ts` — 内存快照存储

**文件：** `packages/opencode/src/session/debug-capture.ts`

- 定义 `DebugCaptureSnapshot` 结构：
  - `system` — 系统提示数组
  - `tools` — 工具名列表
  - `additions` — 环境 / skills / instructions 等附加内容
  - `instructionPaths` — 指令文件路径（相对 worktree 展示）
  - `messageCount` — 送入模型的消息条数
  - `capturedAt` — 捕获时间戳
- 提供 `capture(sessionID, userMessageID, payload)` 与 `get(sessionID, messageID?)`
- LRU 限制：最多 **50** 个 session、每 session 最多 **10** 条 user turn 快照

### 2. 在 prompt runLoop 中挂钩捕获

**文件：** `packages/opencode/src/session/prompt.ts`

在调用 `buildLLMRequestPrefix()` 之后、真正 `process` 调模型之前，写入快照：

```ts
const { system: prebuiltSystem, inheritedMessages: modelMsgs } =
  yield* buildLLMRequestPrefix({ sessionID, agent, model, msgs, additions })

DebugCapture.capture(sessionID, lastUser.id, {
  system: prebuiltSystem,
  tools: Object.keys(tools),
  additions,
  instructionPaths,
  messageCount: modelMsgs.length,
})
```

捕获内容与 `buildLLMRequestPrefix`（`llm-request-prefix.ts`）一致，即：

- 由 `LLM.buildSystemArray` 组装的 system prompt
- 当前 agent 可用工具名
- env / skills / instructions 等 additions
- 历史消息转 model messages 后的条数

**注意：** 快照是**请求前缀**（system + tools + 消息计数），不包含完整 messages 正文；完整 dump 需走更早的 `ContextDump` API（`cf16b27f`，不在本 6 小时范围内）。

### 3. 新增 HTTP API

**文件：** `packages/opencode/src/server/routes/instance/session.ts`

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/session/:sessionID/debug-context` | 返回内存中的 LLM 请求前缀快照 |

**Query 参数：**

- `messageID`（可选）— 指定某条 user 消息对应的快照；省略则返回该 session 最新一条

**响应示例字段：** 与 `DebugCaptureSnapshot` 相同。

**404：** 无快照时返回 `{ error: "Debug context not found" }`（例如 session 重启后内存清空、或尚未发过消息）。

### 4. 单元测试

**文件：** `packages/opencode/test/session/debug-capture.test.ts`

覆盖：按 messageID 读取、无 messageID 取最新、session LRU 淘汰、每 session 消息数上限。

---

## DeepSeek 双模型配置

绿色版与开发脚本共用 DeepSeek 模型定义，见 `script/standalone/mimo-config.json`。

模型：`deepseek/deepseek-v4-flash`、`deepseek/deepseek-v4-pro`  
鉴权：在 `mimo-auth.json` 中填写 `deepseek.key`

---

## 使用方式

1. 启动 MiMo serve（`script\run-distWebServer.bat` 或 `script\start-mimo-serve.bat`）
2. 对某 session 发送至少一条 user 消息并完成一轮 LLM 调用
3. 请求 `GET /session/{sessionID}/debug-context`，可选带 `?messageID={userMessageID}`
4. 检查响应中的 `system`、`tools`、`additions`、`instructionPaths`、`messageCount` 是否与预期一致

若返回 404，常见原因：服务重启导致内存快照丢失、该 turn 尚未触发 capture、或 `messageID` 不存在/不匹配。
