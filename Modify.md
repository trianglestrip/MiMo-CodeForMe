# MiMo-CodeForMe 定制改动说明

> 基于上游 [XiaomiMiMo/MiMo-Code](https://github.com/XiaomiMiMo/MiMo-Code) `main`（已合并 upstream/main，2026-07-03）  
> README 与上游保持一致；**本文件为 fork 相对上游的唯一差异说明入口**。

---

## 1. 打包与部署

| 路径 | 说明 |
|------|------|
| `buildserve.bat` | 一键编译 `mimo.exe` 到 `distWebServer/server/` |
| `script/distWebServer-launch/` | serve 启动/停止脚本（`start.bat`、`stop.bat`、`run-mimo.bat`） |
| `script/standalone/mimo-config.json` | standalone 默认模型 `mimo/mimo-auto`，禁用 opencode free tier |
| `script/standalone/mimo-auth.json.example` | 多 Provider 凭证模板（mimo、deepseek、zhipuai 等） |

`buildserve.bat` 会将 standalone 配置与 launch 脚本复制到 `distWebServer/`。

---

## 2. Serve 模式

- **Headless API-only**：已删除独立 `web/` Vue 前端，仅保留 MiMo serve
- **独立数据目录**：`distWebServer` 使用自己的 `.dev-home`，与开发环境隔离
- **启动方式**：`distWebServer/start.bat`，支持 `/bg` 后台启动与 Basic Auth 健康检查

---

## 3. 控制面 API（相对上游增量）

上游 `control/index.ts` 仅有 `PUT/DELETE /auth/:providerID`；本 fork 新增：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/control/auth` | 列出所有 provider 凭证 |
| `GET` | `/control/auth/:providerID` | 读取单个 provider 凭证 |

文件：`packages/opencode/src/server/routes/control/index.ts`

---

## 4. LLM Debug（轻量快照）

用于调试「模型实际收到了什么」，**不包含**完整 messages 正文。

| 组件 | 路径 |
|------|------|
| 内存快照 | `packages/opencode/src/session/debug-capture.ts` |
| 自动捕获 | `packages/opencode/src/session/prompt.ts` — `DebugCapture.capture()` |
| HTTP API | `GET /session/:sessionID/debug-context` |

查询参数 `messageID`（可选）指定某条 user turn；省略则返回最新快照。

### 已移除（2026-07-03 清理）

以下原为 fork 临时代码，已删除，日常调试仅用 `debug-context`：

- ~~`session/dump.ts`~~ — `ContextDump` 完整导出（需 `dump_context` 开关）
- ~~`POST/GET /dump-context`~~ — 对应 HTTP 路由
- ~~`experimental.dump_context`~~ — config 开关

---

## 5. Provider 配置

文件：`packages/opencode/src/provider/provider.ts`

- **mimo custom loader**：`baseURL` 指向 free channel（`api/free-ai/openai`），`apiKey` 默认 `mimo-free`
- **defaultModelIDs**：对 `mimo` provider 优先选择 `mimo-auto`

TUI 默认模型回退：`packages/opencode/src/cli/cmd/tui/context/local.tsx` 在无配置时选 `mimo/mimo-auto`。

---

## 6. CAD 工具集

通过 `.dev-home` 配置加载，调用 BcAIEP CAD 服务（默认 `http://127.0.0.1:18520`）：

| 路径 | 说明 |
|------|------|
| `script/distWebServer-launch/.dev-home/config/tool/cad.ts` | CAD 工具定义（`cad_call`、`cad_capabilities` 等） |
| `script/distWebServer-launch/.dev-home/config/skill/cad/SKILL.md` | CAD 调用 Skill |

---

## 7. Bug 修复（上游尚未合入）

**Windows memory 路径**：`packages/opencode/src/memory/paths.ts`

- 问题：`memory.reconcile` 在 Windows 下因反斜杠路径无法解析，产生 `path outside memory layout` WARN
- 修复：匹配前将 `\` 归一化为 `/`
- 测试：`packages/opencode/test/memory/paths.test.ts`、`cc-paths.test.ts`

---

## 8. 构建配置

`turbo.json` 保留 fork 的 test/build 任务定义（合并上游后需确认未丢失）：

- `@mimo-ai/cli#test` / `@mimo-ai/cli#test:ci`
- `@mimo-ai/app#test` / `@mimo-ai/app#test:ci`
- `build` 任务

---

## 9. 已移除的 fork 临时代码

| 改动 | 原因 |
|------|------|
| ~~`middleware.ts` IPv6 `[::1]` CORS~~ | 删除 `web/` 后无浏览器 IPv6 访问场景 |
| ~~`app-runtime.ts` `SystemPrompt.defaultLayer`~~ | 仅为已删除的 `ContextDump` 服务；`prompt.ts` 内部自带 Layer |

---

## 10. 已知 WARN（预期行为）

- **`@mimo-ai/plugin` npm 安装失败**：prod 打包尝试安装未发布到 npm 的版本；CAD 工具仍从 exe 内置模块加载，功能不受影响。

---

## 快速验证

```bat
cd MiMo-CodeForMe
buildserve.bat nopause
distWebServer\start.bat
```

- memory reconcile 无 `path outside memory layout` WARN
- `GET /session/{id}/debug-context` 返回快照
- CAD 工具在 Agent 会话中可用
