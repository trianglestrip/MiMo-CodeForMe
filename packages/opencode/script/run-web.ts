#!/usr/bin/env bun
import fs from "fs"
import path from "path"

const pkgDir = path.resolve(import.meta.dir, "..")
const appDir = path.resolve(pkgDir, "../app")
const extDir = path.join(pkgDir, "src", "ext")
const overlaySrc = path.resolve(pkgDir, "../../mimoapi/packages/opencode/src/ext")

const SERVER_PORT = 4096
const WEB_PORT = 3000
const WEB_URL = `http://localhost:${WEB_PORT}`
const SERVER_URL = `http://localhost:${SERVER_PORT}`

let injected = false
if (!fs.existsSync(extDir) && fs.existsSync(overlaySrc)) {
  fs.cpSync(overlaySrc, extDir, { recursive: true })
  injected = true
}

function cleanupExt() {
  if (injected) fs.rmSync(extDir, { recursive: true, force: true })
}

function usage() {
  process.stderr.write(`MiMoCode Web 单机模式 (serve + dev:web)

用法:
  bun run packages/opencode/script/run-web.ts [--dir <工作目录>] [--no-open]

  --dir      API Server 工作目录（可打开的本地路径须在其下），默认当前目录
  --no-open  启动后不自动打开浏览器

前端: ${WEB_URL}
后端: ${SERVER_URL}
`)
}

function parseArgs(argv: string[]) {
  let workDir = process.cwd()
  let openBrowser = true

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--help" || arg === "-h") {
      usage()
      process.exit(0)
    }
    if (arg === "--no-open") {
      openBrowser = false
      continue
    }
    if (arg === "--dir") {
      const next = argv[++i]
      if (!next) {
        process.stderr.write("error: --dir requires a path\n")
        process.exit(1)
      }
      workDir = path.resolve(next)
      continue
    }
    if (arg.startsWith("-")) {
      process.stderr.write(`error: unknown option ${arg}\n`)
      usage()
      process.exit(1)
    }
    workDir = path.resolve(arg)
  }

  if (!fs.existsSync(workDir)) {
    process.stderr.write(`error: directory not found: ${workDir}\n`)
    process.exit(1)
  }

  return { workDir, openBrowser }
}

async function waitForServer(url: string, auth?: { username: string; password: string }, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs
  const headers = auth
    ? { Authorization: `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString("base64")}` }
    : undefined
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/global/health`, { headers })
      if (res.ok) return
    } catch {
      // retry
    }
    await Bun.sleep(250)
  }
  throw new Error(`server did not become ready at ${url}`)
}

async function ensurePortFree(port: number) {
  if (process.platform !== "win32") return
  const proc = Bun.spawn(
    [
      "cmd",
      "/c",
      `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') do taskkill /F /PID %a 2>nul`,
    ],
    { stdout: "ignore", stderr: "ignore" },
  )
  await proc.exited
  await Bun.sleep(300)
}

async function openBrowser(url: string) {
  const platform = process.platform
  if (platform === "win32") {
    await Bun.spawn(["cmd", "/c", "start", "", url], { stdout: "ignore", stderr: "ignore" }).exited
    return
  }
  if (platform === "darwin") {
    await Bun.spawn(["open", url], { stdout: "ignore", stderr: "ignore" }).exited
    return
  }
  await Bun.spawn(["xdg-open", url], { stdout: "ignore", stderr: "ignore" }).exited
}

const { workDir, openBrowser: shouldOpenBrowser } = parseArgs(process.argv.slice(2))

const home =
  process.env.MIMOCODE_HOME ?? path.resolve(pkgDir, "../../.dev-home")

const LOCAL_SERVER_PASSWORD = "mimocode-standalone"
const STANDALONE_CONFIG = JSON.stringify({
  model: "mimo/mimo-auto",
  disabled_providers: ["opencode", "opencode-go"],
})
const STANDALONE_AUTH = JSON.stringify({
  mimo: { type: "api", key: "mimo-free" },
})

const env = {
  ...process.env,
  MIMOCODE_HOME: home,
  MIMOCODE_CONFIG_CONTENT: STANDALONE_CONFIG,
  MIMOCODE_AUTH_CONTENT: STANDALONE_AUTH,
  MIMOCODE_SERVER_PASSWORD: LOCAL_SERVER_PASSWORD,
  MIMOCODE_SERVER_USERNAME: "mimocode",
  VITE_OPENCODE_SERVER_HOST: "localhost",
  VITE_OPENCODE_SERVER_PORT: String(SERVER_PORT),
  VITE_OPENCODE_SERVER_PASSWORD: LOCAL_SERVER_PASSWORD,
  VITE_OPENCODE_SERVER_USERNAME: "mimocode",
}

const indexTs = path.join(pkgDir, "src/index.ts")

process.stdout.write(`MiMoCode Web 单机模式\n`)
process.stdout.write(`  工作目录: ${workDir}\n`)
process.stdout.write(`  后端 API: ${SERVER_URL}\n`)
process.stdout.write(`  前端界面: ${WEB_URL}\n\n`)

await ensurePortFree(SERVER_PORT)
await ensurePortFree(WEB_PORT)

const server = Bun.spawn(
  ["bun", "run", "--conditions=browser", indexTs, "serve", "--port", String(SERVER_PORT)],
  {
    cwd: pkgDir,
    stdout: "inherit",
    stderr: "inherit",
    env,
  },
)

const web = Bun.spawn(["bun", "run", "dev"], {
  cwd: appDir,
  stdout: "inherit",
  stderr: "inherit",
  env,
})

let stopping = false
const stop = async (code = 0) => {
  if (stopping) return
  stopping = true
  server.kill()
  web.kill()
  await Promise.all([server.exited, web.exited]).catch(() => {})
  cleanupExt()
  process.exit(code)
}

process.on("SIGINT", () => void stop(0))
process.on("SIGTERM", () => void stop(0))

try {
  process.stdout.write("等待 API Server 就绪...\n")
  await waitForServer(SERVER_URL, { username: "mimocode", password: LOCAL_SERVER_PASSWORD })
  const authHeader = {
    Authorization: `Basic ${Buffer.from(`mimocode:${LOCAL_SERVER_PASSWORD}`).toString("base64")}`,
  }
  const providers = (await fetch(`${SERVER_URL}/provider`, { headers: authHeader }).then((r) => r.json())) as {
    connected?: string[]
  }
  if (!providers.connected?.includes("mimo")) {
    process.stderr.write(
      "\n警告: MiMo Auto (mimo/mimo-auto) 未加载。请确认 packages/opencode/src/ext/mimo-free.ts 存在。\n",
    )
  }
  process.stdout.write(`\n就绪。请在浏览器打开: ${WEB_URL}\n`)
  process.stdout.write(`在首页选择「打开项目」，路径须位于: ${workDir}\n\n`)
  if (shouldOpenBrowser) await openBrowser(WEB_URL)
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  await stop(1)
}

const exitCode = await Promise.race([
  server.exited.then((code) => ({ from: "server" as const, code: code ?? 1 })),
  web.exited.then((code) => ({ from: "web" as const, code: code ?? 1 })),
])

process.stderr.write(`\n${exitCode.from} exited (${exitCode.code})\n`)
await stop(exitCode.code)
