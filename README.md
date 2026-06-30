<h1 align="center">MiMoCode（distWebServer 分支）</h1>

<p align="center">
  <strong>基于 MiMoCode/OpenCode 的分支：distWebServer 绿色包、DeepSeek 集成、LLM 调试上下文</strong>
</p>

<p align="center">
  中文 | <a href="README.en.md">English</a>
</p>

---

本分支相对上游 `main` 的增量变更说明如下。

## 变更摘要

### 1. distWebServer 打包（`script/distWebServer-launch/`、`buildserve.bat`）

将 MiMoCode 打包为可独立部署的 API 服务绿色版：

- `buildserve.bat` — 编译 `mimo.exe` 并输出到 `distWebServer/`（含配置与启动脚本）
- `script/distWebServer-launch/` — 生产部署用启动脚本（`start.bat`、`stop.bat`、`run-mimo.bat`）
- `script/build-mimo-serve.bat` / `script/run-built-mimo-serve.bat` — 源码编译产物启动（开发用，9000 端口）
- `script/run-distWebServer.bat` — 从仓库根目录快速启动绿色包
- `script/run-cli.bat` / `script/build-run-cli.bat` — CLI 便捷脚本
- `script/standalone/` — 预置配置（`mimo-config.json`、`mimo-auth.json`）

外层 `AgentServer/build-mimo.bat` 会调用本仓库的 `buildserve.bat` 完成构建。

### 2. DeepSeek 服务配置

- `script/standalone/mimo-config.json` 中配置 DeepSeek V4 Flash / V4 Pro
- `script/standalone/mimo-auth.json.example` 提供鉴权模板
- `buildserve.bat` 构建时自动复制配置与 `mimo-auth.json` 到 `distWebServer/server/`

### 3. LLM 调试上下文捕获

- `packages/opencode/src/session/debug-capture.ts` — 在内存中捕获 LLM 请求前缀快照
- `packages/opencode/src/session/dump.ts` — 会话调试数据序列化
- `packages/opencode/test/session/debug-capture.test.ts` — 单元测试
- `docs/llm-debug-context-6h.md` — API 与数据结构说明
- `GET /session/:sessionID/debug-context` — 供外部检查实际送入模型的 system / tools / additions

### 4. 运行时数据隔离

- 绿色包运行时数据位于 `distWebServer/.dev-home`（不再写入 AgentServer 根目录）
- `buildserve.bat` 直接从 `NodeInstall` 解析 Node，不依赖 `use-node.bat`

### 5. 移除 Web 前端

- 本分支已移除独立 Vue Web UI，仅保留 API 绿色包与 TUI

---

## 快速开始（distWebServer）

```bat
REM 1. 构建（在 MiMo-CodeForMe 根目录，或运行 AgentServer\build-mimo.bat）
buildserve.bat

REM 2. 如需 DeepSeek，编辑
REM    distWebServer\server\mimo-auth.json

REM 3. 启动
distWebServer\start.bat
REM API: http://127.0.0.1:4096/
```

---

## 开发

```bash
bun install                         # 安装依赖
bun run dev                         # 开发模式
bun turbo typecheck                 # 类型检查
```

```bat
script\start-mimo-serve.bat         # 全局 mimo CLI，9000 端口
script\run-built-mimo-serve.bat     # 使用 packages/opencode/dist 编译产物
script\run-distWebServer.bat        # 启动 distWebServer 绿色包
```

---

## 与上游的关系

本 fork 基于 [MiMoCode](https://github.com/Xiaomi-MiMo/MiMoCode)（源自 [OpenCode](https://github.com/anomalyco/opencode)）。原有能力（多 Provider、TUI、LSP、MCP、插件、持久化记忆、子智能体编排等）均保留。

更完整的产品介绍见 [README.zh.md](./README.zh.md)。

---

## 许可证

源代码基于 [MIT 许可证](./LICENSE) 开源。

使用限制见 [USE_RESTRICTIONS.md](./USE_RESTRICTIONS.md)。
