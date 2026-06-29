#!/usr/bin/env bun
import path from "path"

const rootDir = process.env.MIMOCODE_PROJECT_DIR ?? process.cwd()
const userArgs = process.argv.slice(2)
const message = userArgs.length > 0 ? userArgs : ["用一句话介绍 MiMoCode 是什么"]

const mimoBin = process.env.MIMOCODE_BIN ?? "mimo"
const mimoPath =
  (mimoBin.includes(path.sep) ? mimoBin : Bun.which(mimoBin)) ??
  (process.platform === "win32" ? Bun.which("mimo.cmd") : undefined)

if (!mimoPath) {
  console.error("未找到 mimo 命令。请先安装: npm install -g @mimo-ai/cli @mimo-ai/mimocode-windows-x64")
  process.exit(1)
}

const args = ["run", "--dir", rootDir, "--dangerously-skip-permissions", ...message]
const cmd =
  process.platform === "win32" && mimoPath.toLowerCase().endsWith(".cmd")
    ? ["cmd.exe", "/c", mimoPath, ...args]
    : [mimoPath, ...args]

const proc = Bun.spawn(cmd, {
  cwd: rootDir,
  stdin: "ignore",
  stdout: "inherit",
  stderr: "inherit",
  env: process.env,
})

const onSignal = () => proc.kill()
process.on("SIGINT", onSignal)
process.on("SIGTERM", onSignal)

process.exit((await proc.exited) ?? 1)
