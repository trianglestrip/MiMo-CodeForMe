<h1 align="center">MiMoCode (distWebServer fork)</h1>

<p align="center">
  <strong>Fork of MiMoCode/OpenCode with distWebServer packaging, DeepSeek integration, and LLM debug tooling</strong>
</p>

<p align="center">
  <a href="README.md">中文</a> | English
</p>

---

This branch contains changes relative to the upstream `main` branch. The following describes what was added and why.

## Changes Summary

### 1. distWebServer packaging (`script/distWebServer-launch/`, `buildserve.bat`)

A self-contained distribution server for running MiMoCode as a backend service:

- `buildserve.bat` — bundles the app into a deployable `distWebServer/` directory (mimo.exe + config + launch scripts)
- `script/distWebServer-launch/` — launch scripts (`start.bat`, `stop.bat`, `run-mimo.bat`) for production deployment
- `script/build-mimo-serve.bat` / `script/run-built-mimo-serve.bat` — build & run pipeline for the compiled server binary
- `script/run-distWebServer.bat` — quick-launch the dist server from the repo root
- `script/run-cli.bat` / `script/build-run-cli.bat` — convenience scripts for CLI usage
- `script/standalone/` — pre-baked config files (`mimo-config.json`, `mimo-auth.json`) for standalone deployment

### 2. DeepSeek serve config

- DeepSeek V4 Flash / V4 Pro configured in `script/standalone/mimo-config.json`
- Auth template in `script/standalone/mimo-auth.json.example`
- `buildserve.bat` copies config and auth into `distWebServer/server/` on build

### 3. LLM debug context capture

- `packages/opencode/src/session/debug-capture.ts` — captures LLM request prefix snapshots in memory
- `packages/opencode/src/session/dump.ts` — dump utility for serializing session debug data
- `packages/opencode/test/session/debug-capture.test.ts` — test coverage
- `docs/llm-debug-context-6h.md` — API and schema documentation
- `GET /session/:sessionID/debug-context` — HTTP endpoint for inspection

### 4. Runtime data isolation

- Green bundle runtime data lives under `distWebServer/.dev-home` (not AgentServer root)
- `buildserve.bat` resolves Node from `NodeInstall` directly without `use-node.bat`

### 5. Web UI removed

- The standalone Vue web UI was removed from this fork; use API-only distWebServer or TUI

---

## Quick Start (distWebServer)

```bat
REM 1. Build (from MiMo-CodeForMe root, or AgentServer\build-mimo.bat)
buildserve.bat

REM 2. Edit DeepSeek API key if needed
REM    distWebServer\server\mimo-auth.json

REM 3. Launch
distWebServer\start.bat
REM API: http://127.0.0.1:4096/
```

---

## Development

```bash
bun install                         # Install dependencies
bun run dev                         # Run in development mode
bun turbo typecheck                 # Type check
```

```bat
script\start-mimo-serve.bat         # Global mimo CLI, port 9000
script\run-built-mimo-serve.bat     # Compiled exe from packages/opencode/dist
script\run-distWebServer.bat        # distWebServer green bundle
```

---

## Upstream

This fork is based on [MiMoCode](https://github.com/Xiaomi-MiMo/MiMoCode) (itself a fork of [OpenCode](https://github.com/anomalyco/opencode)). All original features (multiple providers, TUI, LSP, MCP, plugins, persistent memory, subagent orchestration, etc.) remain available.

---

## License

Source code is licensed under the [MIT License](./LICENSE).

Use restrictions: [USE_RESTRICTIONS.md](./USE_RESTRICTIONS.md).
